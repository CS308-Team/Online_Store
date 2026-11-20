# SHOP-91: profile endpoint returns name, e-mail and home address (no password)
from fastapi.testclient import TestClient

import main
from main import app, create_access_token

client = TestClient(app)


class FakeCursor:
    """Veritabanı yerine geçer: SQL sorgusunu kaydeder, sabit bir kullanıcı döner."""

    def __init__(self, row):
        self.row = row
        self.query = None
        self.params = None

    def execute(self, query, params=None):
        self.query = query
        self.params = params

    def fetchone(self):
        return self.row

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor

    def cursor(self):
        return self._cursor

    def close(self):
        pass


def use_fake_db(monkeypatch, row):
    cursor = FakeCursor(row)
    monkeypatch.setattr(main, "get_connection", lambda: FakeConnection(cursor))
    return cursor


def auth_header(user_id=7):
    return {"Authorization": "Bearer " + create_access_token(user_id, "Customer")}


def test_profile_without_token_returns_401():
    assert client.get("/profile").status_code == 401


def test_profile_returns_name_email_and_address(monkeypatch):
    use_fake_db(monkeypatch, {
        "name": "Yasin Yilmaz",
        "email": "yasin@example.com",
        "home_address": "Tuzla, Istanbul",
    })
    response = client.get("/profile", headers=auth_header())
    assert response.status_code == 200
    assert response.json() == {
        "name": "Yasin Yilmaz",
        "email": "yasin@example.com",
        "home_address": "Tuzla, Istanbul",
    }


def test_profile_never_returns_password(monkeypatch):
    cursor = use_fake_db(monkeypatch, {
        "name": "Yasin Yilmaz",
        "email": "yasin@example.com",
        "home_address": "Tuzla, Istanbul",
    })
    body = client.get("/profile", headers=auth_header()).json()
    assert "password" not in body
    assert "password_hash" not in body
    assert "password" not in cursor.query  # şifre sütunu sorguda bile yok


def test_profile_reads_the_logged_in_user(monkeypatch):
    cursor = use_fake_db(monkeypatch, {
        "name": "A", "email": "a@example.com", "home_address": "Somewhere",
    })
    client.get("/profile", headers=auth_header(user_id=42))
    assert cursor.params == (42,)  # id token'dan geliyor


def test_profile_of_deleted_user_returns_404(monkeypatch):
    use_fake_db(monkeypatch, None)
    response = client.get("/profile", headers=auth_header())
    assert response.status_code == 404
