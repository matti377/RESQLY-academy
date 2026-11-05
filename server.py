#!/usr/bin/env python3
"""
server.py — Liefert die Academy aus, speichert Konten und Lernstände und
verwaltet Challenge-Lobbys.

Start:
    python3 server.py

Nur Standardbibliothek — nichts zu installieren. Konten und Lernstände liegen
dauerhaft in SQLite. Challenge-Lobbys bleiben flüchtig im Arbeitsspeicher.

Gespielt wird wie bei Kahoot: Punkte für jede richtige Antwort, mehr Punkte
für schnelle Antworten, Zuschlag für Serien — und am Ende ein Podium.

Die Fragen selbst denkt sich der Server nicht aus. Sie kommen beim Start vom
Gerät des Hosts (das kennt die Befund-Bibliothek bereits) und werden hier nur
verteilt — so kann der Inhalt der Website nicht auseinanderlaufen.
"""

import http.server
import json
import os
import random
import secrets
import socket
import string
import threading
import time
from http.cookies import SimpleCookie
from urllib.parse import urlparse, parse_qs

from account_store import AccountError, AccountStore, SESSION_SECONDS

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get('PORT', '8000'))
# Hinter einem Reverse-Proxy (nginx) HOST=127.0.0.1 setzen — dann ist der
# Port nicht mehr direkt von außen erreichbar.
HOST = os.environ.get('HOST', '0.0.0.0')
ACCOUNT_DB = os.environ.get('RESQLY_DB_PATH', os.path.join(HERE, 'data', 'academy.sqlite3'))
accounts = AccountStore(ACCOUNT_DB)

# I, O, 0 und 1 fehlen — die werden beim Abtippen zu oft verwechselt.
CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
CODE_LEN = 4
MAX_PLAYERS = 60
MAX_QUESTIONS = 40
LOBBY_TTL = 4 * 3600          # verwaiste Lobbys nach vier Stunden vergessen
GRACE = 0.4                   # Nachlauf, damit knappe Antworten noch zählen
AWAY = 5.0                    # wer so lange nicht nachfragt, wird nicht mehr abgewartet
REVEAL = 7.0                  # Auflösung und Zwischenstand zwischen zwei EKGs

# Punkte wie bei Kahoot: Die Hälfte ist für die richtige Antwort sicher, die
# andere Hälfte schmilzt mit der verbrauchten Zeit weg. Serien geben Zuschlag.
BASE_POINTS = 1000
STREAK_STEP = 100             # je weiterem Treffer in Folge
STREAK_CAP = 5                # … höchstens fünfmal, sonst laufen Serien davon

lobbies = {}
lock = threading.Lock()


def rand(n, pool=string.ascii_letters + string.digits):
    return ''.join(secrets.choice(pool) for _ in range(n))


def clean_questions(value):
    """Validate the shared web/app payload before it enters a live lobby."""
    if not isinstance(value, list) or not 1 <= len(value) <= MAX_QUESTIONS:
        raise ValueError('Bitte 1–40 gültige Fragen senden')
    out = []
    for q in value:
        if not isinstance(q, dict):
            raise ValueError('Ungültige Frage')
        options = q.get('options')
        correct = q.get('correct')
        if (not isinstance(options, list) or not 2 <= len(options) <= 4
                or any(not isinstance(o, str) or not o.strip() or len(o) > 200 for o in options)
                or len(set(options)) != len(options)
                or type(correct) is not int or not 0 <= correct < len(options)
                or not isinstance(q.get('rhythm'), str) or not q['rhythm'] or len(q['rhythm']) > 80
                or q.get('name') != options[correct]
                or q.get('speed', 25) not in (25, 50)
                or (q.get('desc') is not None and
                    (not isinstance(q['desc'], str) or len(q['desc']) > 5000))
                or (q.get('leadSet') is not None and
                    (not isinstance(q['leadSet'], str) or len(q['leadSet']) > 80))):
            raise ValueError('Ungültige Frage')
        out.append({k: q[k] for k in ('rhythm', 'options', 'correct', 'name', 'speed', 'desc', 'leadSet') if k in q})
    return out


class Lobby:
    def __init__(self, seconds):
        self.code = None
        self.token = rand(20)
        self.players = {}          # pid -> {'name', 'joined', 'seen'}
        self.order = []            # Beitrittsreihenfolge
        self.questions = []
        self.answers = {}          # index -> pid -> {'i'}
        self.phase = 'lobby'       # lobby | frage | reveal | ende
        self.index = -1
        self.q_start = 0.0
        self.reveal_start = 0.0
        self.seconds = seconds
        self.rev = 1               # Änderungszähler fürs Pollen
        self.touched = time.time()

    # -------------------------------------------------------------- Helfer

    def bump(self):
        self.rev += 1
        self.touched = time.time()

    def add_player(self, name):
        pid = rand(12)
        now = time.time()
        self.players[pid] = {
            'name': name[:24], 'joined': now, 'seen': now,
            'score': 0, 'streak': 0, 'best': 0, 'correct': 0,
            'last': None,          # Ergebnis des letzten EKGs
            'log': [],             # Punkte je EKG, für den Rückblick am Ende
        }
        self.order.append(pid)
        self.bump()
        return pid

    def tick(self):
        """Der Ablauf pro EKG: Frage — Auflösung mit Zwischenstand — nächste
        Frage. Beides läuft von selbst weiter, der Host muss nichts klicken."""
        while True:
            now = time.time()

            if self.phase == 'frage':
                done = self.answers.get(self.index, {})
                # Wer die Seite neu geladen oder geschlossen hat, bliebe sonst
                # als Geist in der Lobby — und auf dessen Antwort würde ewig
                # gewartet.
                active = [p for p in self.players if now - self.players[p]['seen'] < AWAY]
                everyone = active and all(p in done for p in active)
                if not everyone and (now - self.q_start) < self.seconds + GRACE:
                    return
                self.score_round()
                self.phase = 'reveal'
                self.reveal_start = now
                self.bump()
                continue

            if self.phase == 'reveal':
                if now - self.reveal_start < REVEAL:
                    return
                if self.index + 1 >= len(self.questions):
                    self.phase = 'ende'
                else:
                    self.index += 1
                    self.q_start = now
                    self.phase = 'frage'
                self.bump()
                continue

            return

    def score_round(self):
        """Punkte für das gerade gelaufene EKG verteilen. Wird genau einmal
        aufgerufen — beim Übergang von `frage` nach `reveal`."""
        q = self.questions[self.index]
        given = self.answers.get(self.index, {})
        for pid, pl in self.players.items():
            a = given.get(pid)
            if a and a['i'] == q['correct']:
                pl['streak'] += 1
                pl['correct'] += 1
                pl['best'] = max(pl['best'], pl['streak'])
                # Je früher die Antwort, desto mehr — die halbe Punktzahl ist
                # aber auch in der letzten Sekunde noch sicher.
                frac = min(1.0, max(0.0, a['t'] / self.seconds)) if self.seconds else 0.0
                base = int(round(BASE_POINTS * (1.0 - frac / 2.0)))
                bonus = min(pl['streak'] - 1, STREAK_CAP) * STREAK_STEP
                pl['score'] += base + bonus
                pl['last'] = {'ok': True, 'base': base, 'bonus': bonus,
                              'gain': base + bonus, 'streak': pl['streak'],
                              'lost': 0, 'secs': round(a['t'], 2),
                              'answer': q['options'][a['i']]}
            else:
                pl['last'] = {'ok': False, 'base': 0, 'bonus': 0, 'gain': 0,
                              'streak': 0, 'lost': pl['streak'], 'secs': None,
                              'answer': q['options'][a['i']] if a else None}
                pl['streak'] = 0
            pl['log'].append(pl['last']['gain'])

    def board(self):
        """Rangliste, bester zuerst. Gleichstand teilt sich den Platz."""
        rows = sorted(self.players.items(),
                      key=lambda kv: (-kv[1]['score'], kv[1]['joined']))
        out = []
        rank, prev = 0, None
        for n, (pid, pl) in enumerate(rows):
            if pl['score'] != prev:
                rank, prev = n + 1, pl['score']
            out.append({'id': pid, 'name': pl['name'], 'rank': rank,
                        'score': pl['score'], 'streak': pl['streak'],
                        'best': pl['best'], 'correct': pl['correct'],
                        'gain': (pl['last'] or {}).get('gain', 0)})
        return out

    def review(self, pid):
        """Auflösung am Ende: pro EKG die eigene Antwort und wie die Gruppe lag."""
        log = (self.players.get(pid) or {}).get('log') or []
        rows = []
        for n, q in enumerate(self.questions):
            given = self.answers.get(n, {})
            mine = given.get(pid)
            rows.append({
                'name': q['name'],
                'mine': q['options'][mine['i']] if mine else None,
                'ok': bool(mine) and mine['i'] == q['correct'],
                'right': sum(1 for a in given.values() if a['i'] == q['correct']),
                'answered': len(given),
                'gain': log[n] if n < len(log) else 0,
            })
        return rows

    def tally(self):
        """Wie oft wurde welche Kachel gewählt — für die Balken bei der Auflösung."""
        q = self.questions[self.index]
        counts = [0] * len(q['options'])
        for a in self.answers.get(self.index, {}).values():
            if 0 <= a['i'] < len(counts):
                counts[a['i']] += 1
        return counts

    def snapshot(self, pid=None):
        self.touched = time.time()
        if pid in self.players:
            self.players[pid]['seen'] = time.time()
        self.tick()
        out = {
            'code': self.code,
            'phase': self.phase,
            'rev': self.rev,
            'index': self.index,
            'total': len(self.questions),
            'seconds': self.seconds,
            'players': [{'id': p, 'name': self.players[p]['name']} for p in self.order
                        if p in self.players],
            'answered': len(self.answers.get(self.index, {})),
        }
        if self.phase == 'frage' and 0 <= self.index < len(self.questions):
            q = self.questions[self.index]
            out['question'] = {'rhythm': q['rhythm'], 'options': q['options'],
                               'leadSet': q.get('leadSet'),
                               'speed': q.get('speed', 25)}
            out['remaining'] = max(0.0, self.seconds - (time.time() - self.q_start))
            mine = self.answers.get(self.index, {}).get(pid)
            if mine:
                out['myAnswer'] = mine['i']
        if self.phase == 'reveal' and 0 <= self.index < len(self.questions):
            q = self.questions[self.index]
            out['question'] = {'rhythm': q['rhythm'], 'options': q['options'],
                               'leadSet': q.get('leadSet'),
                               'speed': q.get('speed', 25),
                               'correct': q['correct'], 'name': q['name'],
                               'desc': q.get('desc')}
            out['counts'] = self.tally()
            out['revealIn'] = max(0.0, REVEAL - (time.time() - self.reveal_start))
            out['board'] = self.board()
            mine = self.answers.get(self.index, {}).get(pid)
            if mine:
                out['myAnswer'] = mine['i']
            if pid in self.players:
                out['result'] = self.players[pid]['last']
        if self.phase == 'ende':
            out['review'] = self.review(pid)
            out['board'] = self.board()
        if pid and pid in self.players:
            pl = self.players[pid]
            out['me'] = {'id': pid, 'name': pl['name'], 'score': pl['score'],
                         'streak': pl['streak'], 'best': pl['best'],
                         'correct': pl['correct']}
        return out


def sweep():
    """Alte Lobbys aufräumen, damit der Speicher nicht unbegrenzt wächst."""
    now = time.time()
    for code in [c for c, l in lobbies.items() if now - l.touched > LOBBY_TTL]:
        lobbies.pop(code, None)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    # Standard-Logzeilen unterdrücken, sonst rauscht das Pollen die Konsole zu.
    def log_message(self, fmt, *args):
        pass

    def translate_path(self, path):
        # Each course folder has its own index.html. Only known app routes fall
        # back to that shell. Missing assets and API requests must remain real
        # 404 responses (also works for HEAD).
        parts = urlparse(path).path.strip('/').split('/')
        course = None
        if parts[0] in ('sono', 'ekg', 'roentgen'):
            course, parts = parts[0], parts[1:]
        ekg = {'pfad', 'trainer', 'bibliothek', 'labor', 'ableitungen',
               'challenge'}
        simple = ekg | {'home', 'faelle', 'wissen', 'quellen', 'methodik',
                        'simulator', 'atlas'}
        detail = {'lektion', 'modul', 'quiz', 'fall', 'simulator', 'atlas', 'runde'}
        is_route = ((len(parts) == 1 and parts[0] in simple) or
                    (len(parts) == 2 and parts[0] in detail and
                     parts[1] and all(c.isalnum() or c == '-' for c in parts[1])))
        if is_route:
            # Routes without a folder predate the folders: EKG names stay EKG.
            if course is None:
                course = 'ekg' if parts[0] in ekg | {'lektion'} else 'sono'
            return os.path.join(HERE, course, 'index.html')
        return super().translate_path(path)

    # ------------------------------------------------------------- Antwort

    def send_json(self, obj, status=200, extra_headers=None):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if not self.path.startswith(('/api/account/', '/api/progress')):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        for name, value in (extra_headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def fail(self, msg, status=400):
        self.send_json({'error': msg}, status)

    def read_json(self):
        try:
            n = int(self.headers.get('Content-Length', '0'))
            if not 0 < n <= 256 * 1024:
                raise ValueError()
            data = json.loads(self.rfile.read(n))
            if not isinstance(data, dict):
                raise ValueError()
            return data
        except (ValueError, TypeError):
            raise ValueError('Ungültige Anfrage')

    def do_OPTIONS(self):
        self.send_response(204)
        if not self.path.startswith(('/api/account/', '/api/progress')):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def account_token(self):
        bearer = self.headers.get('Authorization', '')
        if bearer.startswith('Bearer '):
            return bearer[7:]
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
        except Exception:
            return None
        return cookie['resqly_session'].value if 'resqly_session' in cookie else None

    def account_user(self):
        user = accounts.user_for_token(self.account_token())
        if not user:
            self.fail('Bitte anmelden', 401)
        return user

    def same_origin(self):
        origin = self.headers.get('Origin')
        if not origin:
            return True  # native apps do not send an Origin header
        parsed = urlparse(origin)
        return parsed.scheme in ('http', 'https') and parsed.netloc.lower() == self.headers.get('Host', '').lower()

    def session_cookie(self, token=None):
        parts = ['resqly_session=' + (token or ''), 'Path=/', 'HttpOnly', 'SameSite=Lax',
                 'Max-Age=' + str(SESSION_SECONDS if token else 0)]
        host = self.headers.get('Host', '').split(':')[0].lower()
        if host == 'resqly.lu' or host.endswith('.resqly.lu'):
            parts.append('Domain=.resqly.lu')
        if self.headers.get('X-Forwarded-Proto', '').lower() == 'https':
            parts.append('Secure')
        return '; '.join(parts)

    def account_post(self, path, data):
        if not self.same_origin():
            return self.fail('Ungültiger Ursprung', 403)
        try:
            if path == '/api/account/register':
                user, token = accounts.register(data.get('email'), data.get('password'))
                result = {'user': user}
                if data.get('client') == 'native':
                    result['token'] = token
                return self.send_json(result, 201, {'Set-Cookie': self.session_cookie(token)})
            if path == '/api/account/login':
                user, token = accounts.login(data.get('email'), data.get('password'))
                result = {'user': user}
                if data.get('client') == 'native':
                    result['token'] = token
                return self.send_json(result, extra_headers={'Set-Cookie': self.session_cookie(token)})
            if path == '/api/account/logout':
                accounts.logout(self.account_token())
                return self.send_json({'ok': True}, extra_headers={'Set-Cookie': self.session_cookie()})
        except AccountError as error:
            return self.fail(str(error), error.status)
        return self.fail('Unbekannter Endpunkt', 404)

    def progress_put(self, path, data):
        if not self.same_origin():
            return self.fail('Ungültiger Ursprung', 403)
        user = self.account_user()
        if not user:
            return
        specialty = path.removeprefix('/api/progress/')
        try:
            return self.send_json(accounts.save_progress(user['id'], specialty, data))
        except AccountError as error:
            return self.fail(str(error), error.status)

    # ------------------------------------------------------------- Routing

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith('/api/'):
            return self.api_get(path, parse_qs(urlparse(self.path).query))
        # Statische Dateien nicht zwischenspeichern — sonst sehen die Geräte
        # im Kurs unterschiedliche Stände.
        return super().do_GET()

    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def api_get(self, path, q):
        if path == '/api/account/me':
            user = self.account_user()
            if user:
                return self.send_json({'user': user})
            return
        if path == '/api/progress' or path.startswith('/api/progress/'):
            user = self.account_user()
            if not user:
                return
            specialty = path.removeprefix('/api/progress/') if path != '/api/progress' else None
            try:
                return self.send_json(accounts.get_progress(user['id'], specialty))
            except AccountError as error:
                return self.fail(str(error), error.status)
        if path == '/api/ping':
            return self.send_json({'ok': True, 'lobbies': len(lobbies), 'protocol': 1})

        if path == '/api/state':
            code = (q.get('code', [''])[0] or '').upper()
            pid = q.get('player', [''])[0]
            with lock:
                sweep()
                lob = lobbies.get(code)
                if not lob:
                    return self.fail('Lobby nicht gefunden', 404)
                if pid and pid not in lob.players:
                    return self.fail('Du bist nicht mehr in dieser Lobby', 403)
                return self.send_json(lob.snapshot(pid))

        return self.fail('Unbekannter Endpunkt', 404)

    def do_POST(self):
        path = urlparse(self.path).path
        if not path.startswith('/api/'):
            return self.fail('Unbekannter Endpunkt', 404)
        try:
            data = self.read_json()
        except ValueError as e:
            return self.fail(str(e))

        if path.startswith('/api/account/'):
            return self.account_post(path, data)

        for field in ('name', 'code', 'player', 'token'):
            if field in data and not isinstance(data[field], str):
                return self.fail('Ungültige Anfrage')

        with lock:
            sweep()

            if path == '/api/lobby':
                name = (data.get('name') or '').strip()[:24] or 'Host'
                try:
                    secs = max(5, min(120, int(data.get('seconds') or 20)))
                except (TypeError, ValueError, OverflowError):
                    return self.fail('Ungültige Zeit pro Frage')
                lob = Lobby(secs)
                lob.code = self.new_code()
                lobbies[lob.code] = lob
                pid = lob.add_player(name)
                return self.send_json({'code': lob.code, 'token': lob.token,
                                       'player': pid})

            code = (data.get('code') or '').strip().upper()
            lob = lobbies.get(code)
            if not lob:
                return self.fail('Lobby nicht gefunden', 404)

            if path == '/api/join':
                if lob.phase != 'lobby':
                    return self.fail('Die Challenge läuft bereits', 409)
                if len(lob.players) >= MAX_PLAYERS:
                    return self.fail('Lobby ist voll', 409)
                name = (data.get('name') or '').strip()[:24]
                if not name:
                    return self.fail('Bitte einen Namen angeben')
                taken = {lob.players[p]['name'].lower() for p in lob.players}
                if name.lower() in taken:
                    return self.fail('Diesen Namen gibt es schon')
                return self.send_json({'player': lob.add_player(name)})

            if path == '/api/leave':
                pid = data.get('player')
                if pid in lob.players:
                    lob.players.pop(pid, None)
                    lob.order.remove(pid)
                    for given in lob.answers.values():
                        given.pop(pid, None)
                    lob.bump()
                    lob.tick()
                return self.send_json({'ok': True})

            # Ab hier nur der Host
            if path in ('/api/start', '/api/close'):
                if data.get('token') != lob.token:
                    return self.fail('Nur der Host darf das', 403)

            if path == '/api/start':
                if lob.phase != 'lobby':
                    return self.fail('Die Challenge läuft bereits', 409)
                try:
                    qs = clean_questions(data.get('questions'))
                except ValueError as e:
                    return self.fail(str(e))
                lob.questions = qs
                lob.answers = {}
                lob.index = 0
                lob.phase = 'frage'
                lob.q_start = time.time()
                lob.bump()
                return self.send_json({'ok': True})

            if path == '/api/answer':
                pid = data.get('player')
                if pid not in lob.players:
                    return self.fail('Unbekannter Spieler', 403)
                lob.players[pid]['seen'] = time.time()
                lob.tick()
                # Die Frage kann inzwischen weitergesprungen sein — dann darf
                # die Antwort nicht beim nächsten EKG landen.
                if lob.phase != 'frage' or type(data.get('q')) is not int or data['q'] != lob.index:
                    return self.fail('Zu spät', 409)
                slot = lob.answers.setdefault(lob.index, {})
                if pid in slot:
                    return self.fail('Schon geantwortet', 409)
                i = data.get('index')
                if type(i) is not int or not 0 <= i < len(lob.questions[lob.index]['options']):
                    return self.fail('Ungültige Antwort')
                slot[pid] = {'i': i, 't': max(0.0, time.time() - lob.q_start)}
                lob.bump()
                lob.tick()          # waren das alle, geht es sofort weiter
                return self.send_json({'ok': True})

            if path == '/api/close':
                lobbies.pop(code, None)
                return self.send_json({'ok': True})

        return self.fail('Unbekannter Endpunkt', 404)

    def do_PUT(self):
        path = urlparse(self.path).path
        if not path.startswith('/api/progress/'):
            return self.fail('Unbekannter Endpunkt', 404)
        try:
            data = self.read_json()
        except ValueError as error:
            return self.fail(str(error))
        return self.progress_put(path, data)

    def new_code(self):
        while True:
            c = ''.join(random.choice(CODE_CHARS) for _ in range(CODE_LEN))
            if c not in lobbies:
                return c


def lan_ip():
    """Die Adresse, unter der andere Geräte im selben Netz den Server sehen."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))     # verbindet nicht wirklich
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    ip = lan_ip()
    print('')
    print('  Resqly Academy — Server läuft')
    print('  ' + '-' * 42)
    print('  Auf diesem Gerät:   http://localhost:%d/' % PORT)
    if HOST not in ('127.0.0.1', 'localhost'):
        print('  Für alle im WLAN:   http://%s:%d/' % (ip, PORT))
    print('')
    print('  Zum Beenden: Strg+C')
    print('')
    try:
        Server((HOST, PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print('\n  Server beendet.\n')
