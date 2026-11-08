import json
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server

QUESTION = {'rhythm': 'sinus', 'name': 'Sinusrhythmus', 'desc': 'Test',
            'options': ['Sinusrhythmus', 'Vorhofflimmern', 'AV-Block', 'Asystolie'],
            'correct': 0, 'speed': 50, 'leadSet': None}


class MultiplayerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = server.Server(('127.0.0.1', 0), server.Handler)
        cls.base = 'http://127.0.0.1:%d/api/' % cls.httpd.server_port
        cls.worker = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.worker.join()

    def setUp(self):
        with server.lock:
            server.lobbies.clear()

    def api(self, path, data=None, status=200):
        req = Request(self.base + path,
                      data=json.dumps(data).encode() if data is not None else None,
                      headers={'Content-Type': 'application/json', 'Origin': 'http://another-device:3000'})
        try:
            response = urlopen(req, timeout=3)
        except HTTPError as error:
            response = error
        with response:
            self.assertEqual(status, response.status)
            self.assertEqual('*', response.headers['Access-Control-Allow-Origin'])
            return json.load(response)

    def lobby(self):
        host = self.api('lobby', {'name': 'App Host', 'seconds': 20})
        peer = self.api('join', {'name': 'Web Player', 'code': host['code'].lower()})
        return host, peer

    def test_shared_game_scores_streaks_review_and_answer_privacy(self):
        with patch.object(server.time, 'time', return_value=1000) as clock:
            host, peer = self.lobby()
            credentials = {'code': host['code'], 'token': host['token']}
            self.api('start', {**credentials, 'questions': [QUESTION, QUESTION]})
            path = 'state?code=%s&player=%s' % (host['code'], peer['player'])
            state = self.api(path)
            self.assertEqual(2, len(state['players']))
            self.assertEqual(50, state['question']['speed'])
            self.assertNotIn('correct', state['question'])
            self.assertNotIn('name', state['question'])
            for index in range(2):
                clock.return_value += 2
                for player in (host['player'], peer['player']):
                    self.api('answer', {'code': host['code'], 'player': player, 'q': index, 'index': 0})
                state = self.api(path)
                self.assertEqual('reveal', state['phase'])
                self.assertEqual([2, 0, 0, 0], state['counts'])
                self.assertEqual(950 + index * 100, state['result']['gain'])
                self.assertEqual([1, 1], [p['rank'] for p in state['board']])
                clock.return_value += server.REVEAL + .1
                self.api(path)
            state = self.api(path)
            self.assertEqual('ende', state['phase'])
            self.assertEqual(2000, state['me']['score'])
            self.assertEqual(2, state['me']['best'])
            self.assertEqual([True, True], [r['ok'] for r in state['review']])
            self.api('close', credentials)
            self.api(path, status=404)

    def test_host_permissions_duplicate_and_stale_answers(self):
        host, peer = self.lobby()
        code = host['code']
        self.api('start', {'code': code, 'token': 'wrong', 'questions': [QUESTION]}, status=403)
        payload = {'code': code, 'token': host['token'], 'questions': [QUESTION, QUESTION]}
        self.api('start', payload)
        self.api('start', payload, status=409)
        self.api('join', {'code': code, 'name': 'Late'}, status=409)
        answer = {'code': code, 'player': peer['player'], 'q': 0, 'index': 0}
        self.api('answer', {**answer, 'q': -1}, status=409)
        self.api('answer', {**answer, 'index': 99}, status=400)
        self.api('answer', answer)
        self.api('answer', answer, status=409)
        state = self.api('state?code=%s&player=%s' % (code, peer['player']))
        self.assertEqual(0, state['myAnswer'])
        self.assertEqual('frage', state['phase'])
        self.api('answer', {**answer, 'player': host['player'], 'index': 1})
        state = self.api('state?code=%s&player=%s' % (code, host['player']))
        self.assertEqual(0, state['result']['gain'])
        self.assertEqual(0, state['me']['streak'])

    def test_bad_payloads_do_not_break_lobby_and_names_are_unique(self):
        self.api('lobby', {'seconds': 'broken'}, status=400)
        self.api('lobby', {'name': ['bad']}, status=400)
        self.api('lobby', [], status=400)
        host, peer = self.lobby()
        code = host['code']
        self.api('join', {'code': code, 'name': ' WEB PLAYER '}, status=400)
        for value in [[], [None], [{**QUESTION, 'correct': 9}], [{**QUESTION, 'speed': 30}],
                      [{**QUESTION, 'options': 'bad'}], [{**QUESTION, 'correct': True}]]:
            self.api('start', {'code': code, 'token': host['token'], 'questions': value}, status=400)
        state = self.api('state?code=' + code)
        self.assertEqual('lobby', state['phase'])
        self.api('leave', {'code': code, 'player': peer['player']})
        self.api('state?code=%s&player=%s' % (code, peer['player']), status=403)

    def test_timeouts_absent_players_and_polling_keep_lobby_alive(self):
        with patch.object(server.time, 'time', return_value=1000) as clock:
            host, peer = self.lobby()
            code = host['code']
            self.api('start', {'code': code, 'token': host['token'], 'questions': [QUESTION]})
            clock.return_value += server.AWAY + .1
            self.api('answer', {'code': code, 'player': host['player'], 'q': 0, 'index': 0})
            state = self.api('state?code=%s&player=%s' % (code, peer['player']))
            self.assertEqual('reveal', state['phase'])
            self.assertFalse(state['result']['ok'])
            self.assertIsNone(state['result']['answer'])
        # A separate timeout scores missing answers even when nobody submits.
        with patch.object(server.time, 'time', return_value=2000) as clock:
            host = self.api('lobby', {'name': 'Timeout', 'seconds': 5})
            code = host['code']
            self.api('start', {'code': code, 'token': host['token'], 'questions': [QUESTION]})
            clock.return_value += 5 + server.GRACE + .1
            state = self.api('state?code=%s&player=%s' % (code, host['player']))
            self.assertEqual('reveal', state['phase'])
            self.assertEqual(0, state['me']['score'])
            clock.return_value += server.LOBBY_TTL - 1
            self.api('state?code=' + code)
            clock.return_value += 2
            self.api('state?code=' + code)

    def test_browser_preflight(self):
        with urlopen(Request(self.base + 'join', method='OPTIONS'), timeout=3) as response:
            self.assertEqual(204, response.status)
            self.assertIn('POST', response.headers['Access-Control-Allow-Methods'])



class ApplicationRoutingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = server.Server(('127.0.0.1', 0), server.Handler)
        cls.base = 'http://127.0.0.1:%d' % cls.httpd.server_port
        cls.worker = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.worker.join()

    def test_academy_root_course_folders_and_spa_routes(self):
        pages = {'/': 'academy', '/index.html': 'academy',
                 '/ekg/': 'ekg', '/ekg': 'ekg', '/ekg/labor': 'ekg',
                 '/labor': 'ekg', '/lektion/l1-1': 'ekg',
                 '/roentgen/': 'roentgen', '/roentgen': 'roentgen',
                 '/roentgen/lektion/bildstart': 'roentgen',
                 '/roentgen/atlas/clavicle': 'roentgen', '/roentgen/runde/mix': 'roentgen',
                 '/anatomie/': 'anatomie', '/anatomie': 'anatomie',
                 '/anatomie/training': 'anatomie', '/anatomie/atlas': 'anatomie',
                 '/anatomie/bestenliste': 'anatomie'}
        for path, app in pages.items():
            with self.subTest(path=path), urlopen(self.base + path) as response:
                self.assertEqual(response.status, 200)
                body = response.read()
                self.assertIn(b'resqlyAssetRoot', body)
                self.assertIn(b'data-application="%s"' % app.encode(), body)
        with urlopen(Request(self.base + '/sono/atlas', method='HEAD')) as response:
            self.assertEqual(response.status, 200)
        with urlopen(self.base + '/assets/js/sono/core.js') as response:
            self.assertIn(b'probeFrame', response.read())
        for path in ('/sono/', '/sono/lektion/lunge-06', '/simulator'):
            with self.subTest(hidden=path), urlopen(self.base + path) as response:
                body = response.read()
                self.assertIn(b'location.replace', body)
                self.assertNotIn(b'data-application="sono"', body)

    def test_missing_assets_and_unknown_routes_do_not_return_html_shell(self):
        for path in ('/assets/missing.js', '/missing', '/sono/not-real', '/ekg/not-real', '/anatomie/not-real', '/anatomie/missing.js', '/api/not-real'):
            with self.subTest(path=path), self.assertRaises(HTTPError) as error:
                urlopen(self.base + path)
            self.assertEqual(error.exception.code, 404)


if __name__ == '__main__':
    unittest.main()
