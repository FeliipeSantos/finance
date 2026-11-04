import os
import tempfile
import threading
import time
import uuid

# Must run before any `app.*` import: Settings reads DATABASE_URL/ENV/JWT_SECRET
# once at import time, so the test suite needs its own throwaway SQLite file
# instead of touching the real dev finance.db.
_tmp_db_fd, _tmp_db_path = tempfile.mkstemp(suffix=".db")
os.close(_tmp_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db_path.replace(os.sep, '/')}"
os.environ["ENV"] = "development"
os.environ.setdefault("JWT_SECRET", "test-only-secret-do-not-use-in-production")
os.environ["ALLOWED_ORIGINS"] = "*"

import pytest
import requests
import uvicorn

PORT = 8321
BASE_URL = f"http://127.0.0.1:{PORT}/api/v1"


@pytest.fixture(scope="session", autouse=True)
def live_server():
    from app.main import app

    config = uvicorn.Config(app, host="127.0.0.1", port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    for _ in range(100):
        try:
            requests.get(f"http://127.0.0.1:{PORT}/", timeout=0.2)
            break
        except requests.exceptions.ConnectionError:
            time.sleep(0.1)
    else:
        raise RuntimeError("Servidor de teste não subiu a tempo")

    yield

    server.should_exit = True
    thread.join(timeout=5)

    try:
        os.remove(_tmp_db_path)
    except OSError:
        pass


class ApiClient:
    def __init__(self, base_url):
        self.base_url = base_url

    def _headers(self, token):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def get(self, path, token=None):
        return requests.get(self.base_url + path, headers=self._headers(token))

    def post(self, path, token=None, json=None):
        return requests.post(self.base_url + path, headers=self._headers(token), json=json)

    def put(self, path, token=None, json=None):
        return requests.put(self.base_url + path, headers=self._headers(token), json=json)

    def delete(self, path, token=None):
        return requests.delete(self.base_url + path, headers=self._headers(token))


@pytest.fixture
def api():
    return ApiClient(BASE_URL)


@pytest.fixture
def register_user(api):
    def _register(password="123456"):
        email = f"user-{uuid.uuid4().hex[:10]}@test.com"
        resp = api.post("/auth/register", json={"email": email, "password": password, "fullName": "Test User"})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        return {"token": body["token"], "user_id": body["user"]["id"], "email": email}

    return _register


@pytest.fixture
def account_factory(api):
    def _create(token, balance_initial=0):
        resp = api.post(
            "/accounts",
            token=token,
            json={"name": "Conta Teste", "type": "CHECKING", "color": "#111111", "balanceInitial": balance_initial},
        )
        assert resp.status_code == 200, resp.text
        return resp.json()

    return _create
