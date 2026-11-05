"""Persistent accounts and per-specialty learning progress for the web and app API."""

import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager


SPECIALTIES = frozenset(('academy', 'ekg', 'sono', 'roentgen', 'profile'))
PROFILE_SOURCES = ('academy', 'ekg', 'roentgen')
PROFILE_DAYS = 400
SESSION_SECONDS = 30 * 24 * 3600
LOGIN_WINDOW_SECONDS = 15 * 60
MAX_LOGIN_ATTEMPTS = 10
EMAIL_RE = re.compile(r'^[^\s@]{1,64}@[^\s@]{1,190}$')
ID_RE = re.compile(r'^[a-zA-Z0-9_-]{1,100}$')


class AccountError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def _hash_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def _password_hash(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 310_000)


def _bool_map(value):
    if not isinstance(value, dict):
        return {}
    return {key: True for key, item in value.items()
            if isinstance(key, str) and ID_RE.fullmatch(key) and item is True}


def _number(value, default=0, maximum=1_000_000_000):
    return value if type(value) is int and 0 <= value <= maximum else default


def _day_key(value):
    text = str(value or '')
    return tuple(int(part) for part in text.split('-')) if re.fullmatch(r'\d{4}-\d{1,2}-\d{1,2}', text) else (0, 0, 0)


def merge_progress(specialty, previous, incoming):
    """Keep completed work when two devices upload stale snapshots."""
    previous = previous if isinstance(previous, dict) else {}
    incoming = incoming if isinstance(incoming, dict) else {}
    if specialty == 'sono':
        return {
            'version': 1,
            'read': {**_bool_map(previous.get('read')), **_bool_map(incoming.get('read'))},
            'passed': {**_bool_map(previous.get('passed')), **_bool_map(incoming.get('passed'))},
        }
    if specialty in ('ekg', 'roentgen'):
        done = {}
        for source in (previous.get('done'), incoming.get('done')):
            if not isinstance(source, dict):
                continue
            for key, result in source.items():
                if not isinstance(key, str) or not ID_RE.fullmatch(key) or not isinstance(result, dict):
                    continue
                best = _number(result.get('best'), 0, 100)
                done[key] = {'best': max(best, done.get(key, {}).get('best', 0))}
        latest = incoming if _day_key(incoming.get('lastDay')) >= _day_key(previous.get('lastDay')) else previous
        result = {
            'done': done,
            'xp': max(_number(previous.get('xp')), _number(incoming.get('xp'))),
            'streak': _number(latest.get('streak'), 0, 100_000),
            'lastDay': latest.get('lastDay') if re.fullmatch(r'\d{4}-\d{1,2}-\d{1,2}', str(latest.get('lastDay') or '')) else None,
            'sound': incoming.get('sound') if type(incoming.get('sound')) is bool else previous.get('sound', True),
            'unlockAll': incoming.get('unlockAll') if type(incoming.get('unlockAll')) is bool else previous.get('unlockAll', False),
            'mmPerSec': incoming.get('mmPerSec') if incoming.get('mmPerSec') in (25, 50) else previous.get('mmPerSec', 25),
        }
        if specialty == 'roentgen':
            result = {key: result[key] for key in ('done', 'xp', 'streak', 'lastDay')}
            answers = {}
            for source in (previous.get('answers'), incoming.get('answers')):
                if not isinstance(source, dict):
                    continue
                for key, answer in source.items():
                    if not isinstance(key, str) or not ID_RE.fullmatch(key) or not isinstance(answer, dict):
                        continue
                    count = _number(answer.get('n'), 0, 100_000)
                    if count >= answers.get(key, {}).get('n', -1):
                        answers[key] = {'n': count, 'last': answer.get('last') is True}
            result.update({'version': 1, 'answers': answers})
        return result
    if specialty == 'profile':
        # Academy-wide rating: XP per course and XP per learning day only grow.
        xp, days = {}, {}
        for source in (previous, incoming):
            if isinstance(source.get('xp'), dict):
                for key in PROFILE_SOURCES:
                    value = _number(source['xp'].get(key))
                    if value:
                        xp[key] = max(xp.get(key, 0), value)
            if isinstance(source.get('days'), dict):
                for key, value in source['days'].items():
                    if isinstance(key, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', key):
                        days[key] = max(days.get(key, 0), _number(value, 0, 1_000_000))
        return {'version': 1, 'xp': xp, 'days': dict(sorted(days.items())[-PROFILE_DAYS:])}
    if specialty == 'academy':
        answers = {}
        for source in (previous.get('answers'), incoming.get('answers')):
            if not isinstance(source, dict):
                continue
            for key, result in source.items():
                if not isinstance(key, str) or not ID_RE.fullmatch(key) or not isinstance(result, dict):
                    continue
                count = _number(result.get('n'), 0, 100_000)
                if count >= answers.get(key, {}).get('n', -1):
                    answers[key] = {'n': count, 'ok': min(count, _number(result.get('ok'), 0, 100_000)),
                                    'last': result.get('last') is True}
        daily = {}
        for source in (previous.get('daily'), incoming.get('daily')):
            if isinstance(source, dict):
                daily.update({key: value for key, value in source.items()
                              if isinstance(key, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', key)
                              and isinstance(value, dict)})
        return {'v': 1, 'answers': answers, 'daily': daily}
    raise AccountError('Unbekannter Kurs', 404)


class AccountStore:
    def __init__(self, path):
        self.path = path
        os.makedirs(os.path.dirname(os.path.abspath(path)), mode=0o700, exist_ok=True)
        with self.connect() as db:
            db.execute('PRAGMA journal_mode = WAL')
            db.executescript('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    salt BLOB NOT NULL,
                    password_hash BLOB NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS progress (
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    specialty TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    PRIMARY KEY (user_id, specialty)
                );
                CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
                CREATE TABLE IF NOT EXISTS login_attempts (
                    email TEXT PRIMARY KEY,
                    attempts INTEGER NOT NULL,
                    first_at INTEGER NOT NULL
                );
            ''')
        if os.name == 'posix':
            os.chmod(path, 0o600)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            db.row_factory = sqlite3.Row
            db.execute('PRAGMA foreign_keys = ON')
            db.execute('PRAGMA busy_timeout = 10000')
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def _session(self, db, user_id):
        token = secrets.token_urlsafe(32)
        now = int(time.time())
        db.execute('DELETE FROM sessions WHERE expires_at <= ?', (now,))
        db.execute('INSERT INTO sessions VALUES (?, ?, ?)',
                   (_hash_token(token), user_id, now + SESSION_SECONDS))
        return token

    def register(self, email, password):
        email = str(email or '').strip().lower()
        if len(email) > 254 or not EMAIL_RE.fullmatch(email):
            raise AccountError('Bitte eine gültige E-Mail-Adresse eingeben')
        if not isinstance(password, str) or not 10 <= len(password) <= 256:
            raise AccountError('Das Passwort muss mindestens 10 Zeichen haben')
        salt = secrets.token_bytes(16)
        digest = _password_hash(password, salt)
        try:
            with self.connect() as db:
                cursor = db.execute('INSERT INTO users (email, salt, password_hash, created_at) VALUES (?, ?, ?, ?)',
                                    (email, salt, digest, int(time.time())))
                token = self._session(db, cursor.lastrowid)
                return {'id': cursor.lastrowid, 'email': email}, token
        except sqlite3.IntegrityError:
            raise AccountError('Für diese E-Mail-Adresse gibt es bereits ein Konto', 409)

    def login(self, email, password):
        email = str(email or '').strip().lower()
        if len(email) > 254 or not EMAIL_RE.fullmatch(email) or not isinstance(password, str) or len(password) > 256:
            raise AccountError('E-Mail oder Passwort falsch', 401)
        failed = False
        with self.connect() as db:
            now = int(time.time())
            attempt = db.execute('SELECT attempts, first_at FROM login_attempts WHERE email = ?',
                                 (email,)).fetchone()
            if attempt and now - attempt['first_at'] < LOGIN_WINDOW_SECONDS and attempt['attempts'] >= MAX_LOGIN_ATTEMPTS:
                raise AccountError('Zu viele Anmeldeversuche. Bitte später erneut versuchen', 429)
            row = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
            salt = row['salt'] if row else b'\x00' * 16
            actual = row['password_hash'] if row else b'\x00' * 32
            if not secrets.compare_digest(_password_hash(password, salt), actual) or not row:
                count = (attempt['attempts'] + 1 if attempt and now - attempt['first_at'] < LOGIN_WINDOW_SECONDS else 1)
                first = attempt['first_at'] if attempt and now - attempt['first_at'] < LOGIN_WINDOW_SECONDS else now
                db.execute('''INSERT INTO login_attempts VALUES (?, ?, ?)
                              ON CONFLICT(email) DO UPDATE SET attempts=excluded.attempts, first_at=excluded.first_at''',
                           (email, count, first))
                failed = True
            else:
                db.execute('DELETE FROM login_attempts WHERE email = ?', (email,))
                token = self._session(db, row['id'])
                result = ({'id': row['id'], 'email': row['email']}, token)
        if failed:
            raise AccountError('E-Mail oder Passwort falsch', 401)
        return result

    def user_for_token(self, token):
        if not isinstance(token, str) or len(token) > 256:
            return None
        with self.connect() as db:
            row = db.execute('''SELECT users.id, users.email FROM sessions
                                JOIN users ON users.id = sessions.user_id
                                WHERE token_hash = ? AND expires_at > ?''',
                             (_hash_token(token), int(time.time()))).fetchone()
            return dict(row) if row else None

    def logout(self, token):
        if token:
            with self.connect() as db:
                db.execute('DELETE FROM sessions WHERE token_hash = ?', (_hash_token(token),))

    def get_progress(self, user_id, specialty=None):
        if specialty and specialty not in SPECIALTIES:
            raise AccountError('Unbekannter Kurs', 404)
        with self.connect() as db:
            rows = db.execute('SELECT specialty, payload, updated_at FROM progress WHERE user_id = ?',
                              (user_id,)).fetchall()
        result = {row['specialty']: {'data': json.loads(row['payload']), 'updatedAt': row['updated_at']}
                  for row in rows}
        return result.get(specialty) if specialty else result

    def save_progress(self, user_id, specialty, data):
        if specialty not in SPECIALTIES:
            raise AccountError('Unbekannter Kurs', 404)
        if not isinstance(data, dict) or len(json.dumps(data)) > 100_000:
            raise AccountError('Ungültiger Lernstand')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT payload FROM progress WHERE user_id = ? AND specialty = ?',
                             (user_id, specialty)).fetchone()
            merged = merge_progress(specialty, json.loads(row['payload']) if row else {}, data)
            now = int(time.time())
            db.execute('''INSERT INTO progress (user_id, specialty, payload, updated_at)
                          VALUES (?, ?, ?, ?)
                          ON CONFLICT(user_id, specialty) DO UPDATE SET
                          payload = excluded.payload, updated_at = excluded.updated_at''',
                       (user_id, specialty, json.dumps(merged, separators=(',', ':')), now))
            return {'data': merged, 'updatedAt': now}
