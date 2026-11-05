import http.cookiejar
import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from account_store import AccountStore


class AccountAPITest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.previous_store = server.accounts
        server.accounts = AccountStore(str(Path(cls.temp.name) / 'accounts.sqlite3'))
        cls.httpd = server.Server(('127.0.0.1', 0), server.Handler)
        cls.base = 'http://127.0.0.1:%d/api/' % cls.httpd.server_port
        cls.worker = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.worker.join()
        server.accounts = cls.previous_store
        cls.temp.cleanup()

    def setUp(self):
        self.browser = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def api(self, path, method='GET', data=None, status=200, browser=None, headers=None):
        body = json.dumps(data).encode() if data is not None else None
        request = Request(self.base + path, data=body, method=method,
                          headers={'Content-Type': 'application/json', **(headers or {})})
        try:
            response = (browser or self.browser).open(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            self.assertEqual(status, response.status)
            return json.load(response), response.headers

    def test_account_and_three_specialties_share_one_login(self):
        self.api('progress', status=401)
        result, headers = self.api('account/register', 'POST',
                                   {'email': 'learner@example.org', 'password': 'long-secret-123'}, 201)
        self.assertEqual('learner@example.org', result['user']['email'])
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        self.assertNotIn('token', result)
        self.api('progress/ekg', 'PUT', {'done': {'ekg-1': {'best': 70}}, 'xp': 10})
        self.api('progress/sono', 'PUT', {'version': 1, 'read': {'lunge-01': True}})
        self.api('progress/academy', 'PUT', {'v': 1, 'answers': {'q1': {'n': 1, 'ok': 1, 'last': True}}})
        all_progress, _ = self.api('progress')
        self.assertEqual({'academy', 'ekg', 'sono'}, set(all_progress))

        second_browser = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.api('account/login', 'POST',
                 {'email': 'learner@example.org', 'password': 'long-secret-123'}, browser=second_browser)
        remote, _ = self.api('progress/sono', browser=second_browser)
        self.assertTrue(remote['data']['read']['lunge-01'])
        # A stale device upload cannot erase completed lessons.
        merged, _ = self.api('progress/sono', 'PUT',
                             {'version': 1, 'read': {'lunge-02': True}}, browser=second_browser)
        self.assertEqual({'lunge-01', 'lunge-02'}, set(merged['data']['read']))
        self.api('account/logout', 'POST', {})
        self.api('progress/ekg', status=401)
        still_signed_in, _ = self.api('progress/ekg', browser=second_browser)
        self.assertIn('ekg-1', still_signed_in['data']['done'])

    def test_native_token_and_origin_protection(self):
        result, _ = self.api('account/register', 'POST',
                             {'email': 'native@example.org', 'password': 'native-secret-123', 'client': 'native'}, 201)
        token = result['token']
        empty, _ = self.api('progress')
        self.assertEqual({}, empty)
        browser = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        me, _ = self.api('account/me', browser=browser, headers={'Authorization': 'Bearer ' + token})
        self.assertEqual('native@example.org', me['user']['email'])
        self.api('progress/ekg', 'PUT', {'done': {}}, status=403,
                 headers={'Origin': 'https://untrusted.example'})
        self.api('account/login', 'POST', {'email': 'native@example.org', 'password': 'wrong'}, status=401)
        self.api('account/register', 'POST',
                 {'email': 'native@example.org', 'password': 'native-secret-123'}, status=409)

    def test_roentgen_progress_sync_preserves_completion_and_latest_attempts(self):
        self.api('account/register', 'POST',
                 {'email': 'xray@example.org', 'password': 'xray-secret-123'}, 201)
        self.api('progress/roentgen', 'PUT', {
            'version': 1, 'done': {'bildstart': {'best': 100}}, 'xp': 15,
            'streak': 1, 'lastDay': '2026-11-01',
            'answers': {'bildstart-start-check': {'n': 2, 'last': True}}})
        result, _ = self.api('progress/roentgen', 'PUT', {
            'version': 1, 'done': {'systematik': {'best': 67}}, 'xp': 10,
            'streak': 2, 'lastDay': '2026-11-02',
            'answers': {'bildstart-start-check': {'n': 1, 'last': False},
                        'systematik-reading-order': {'n': 1, 'last': False}}})
        data = result['data']
        self.assertEqual({'bildstart', 'systematik'}, set(data['done']))
        self.assertEqual(15, data['xp'])
        self.assertEqual(2, data['streak'])
        self.assertTrue(data['answers']['bildstart-start-check']['last'])
        self.assertFalse(data['answers']['systematik-reading-order']['last'])
        remote, _ = self.api('progress/roentgen')
        self.assertEqual(data, remote['data'])

    def test_profile_sync_keeps_the_highest_xp_and_every_learning_day(self):
        self.api('account/register', 'POST',
                 {'email': 'profile@example.org', 'password': 'profile-secret-123'}, 201)
        self.api('progress/profile', 'PUT', {
            'version': 1, 'xp': {'ekg': 40, 'roentgen': 15},
            'days': {'2026-11-01': 40, '2026-11-02': 15}})
        result, _ = self.api('progress/profile', 'PUT', {
            'version': 1, 'xp': {'ekg': 30, 'academy': 6, 'other': 99},
            'days': {'2026-11-02': 20, '2026-11-03': 6, 'bad': 5}})
        self.assertEqual({'version': 1, 'xp': {'ekg': 40, 'roentgen': 15, 'academy': 6},
                          'days': {'2026-11-01': 40, '2026-11-02': 20, '2026-11-03': 6}}, result['data'])

    def test_repeated_wrong_passwords_are_limited(self):
        self.api('account/register', 'POST',
                 {'email': 'limited@example.org', 'password': 'correct-secret-123'}, 201)
        for _ in range(10):
            self.api('account/login', 'POST',
                     {'email': 'limited@example.org', 'password': 'wrong-secret'}, status=401)
        self.api('account/login', 'POST',
                 {'email': 'limited@example.org', 'password': 'wrong-secret'}, status=429)


if __name__ == '__main__':
    unittest.main()
