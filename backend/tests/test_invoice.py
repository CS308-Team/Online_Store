# SHOP-150, SHOP-151 (story SHOP-88): invoice endpoint and its access control
from datetime import datetime
from decimal import Decimal

from fastapi.testclient import TestClient

import main
from main import app, create_access_token

client = TestClient(app)

ORDER_ROW = {
    "id": 12,
    "created_at": datetime(2026, 11, 26, 14, 30, 0),
    "status": "processing",
    "total_price": Decimal("109.97"),
    "card_last4": "1111",
    "delivery_address": "Orta Mahalle, Tuzla, Istanbul",
    "name": "Test Customer",
    "email": "customer@example.com",
    "tax_id": "1111111111",
    "home_address": "Tuzla, Istanbul",
    "email_sent": 1,  # MySQL BOOLEAN comes back as 0/1
}

ITEM_ROWS = [
    {"product_id": 3, "product_name": "Kind of Blue", "quantity": 2, "unit_price": Decimal("34.99")},
    {"product_id": 4, "product_name": "The Dark Side of the Moon", "quantity": 1, "unit_price": Decimal("39.99")},
]


class FakeCursor:
    """Veritabanı yerine geçer: sorguları kaydeder, sabit sipariş ve ürün satırları döner."""

    def __init__(self, order_row, item_rows):
        self.order_row = order_row
        self.item_rows = item_rows
        self.queries = []  # (sql, params) listesi

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchone(self):
        return self.order_row

    def fetchall(self):
        return self.item_rows

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.closed = False

    def cursor(self):
        return self._cursor

    def close(self):
        self.closed = True


def use_fake_db(monkeypatch, order_row=ORDER_ROW, item_rows=ITEM_ROWS):
    cursor = FakeCursor(order_row, item_rows)
    connection = FakeConnection(cursor)
    monkeypatch.setattr(main, "get_connection", lambda: connection)
    return cursor, connection


def auth_header(user_id=1, role="Customer"):
    return {"Authorization": "Bearer " + create_access_token(user_id, role)}


# --- SHOP-150: invoice endpoint (order, customer, items, totals) ---

def test_invoice_returns_order_customer_items_and_total(monkeypatch):
    use_fake_db(monkeypatch)
    response = client.get("/orders/12/invoice", headers=auth_header())
    assert response.status_code == 200
    assert response.json() == {
        "order_id": 12,
        "created_at": "2026-11-26T14:30:00",
        "status": "processing",
        "total_price": 109.97,
        "card_last4": "1111",
        "delivery_address": "Orta Mahalle, Tuzla, Istanbul",
        "customer": {
            "name": "Test Customer",
            "email": "customer@example.com",
            "tax_id": "1111111111",
            "home_address": "Tuzla, Istanbul",
        },
        "items": [
            {"product_id": 3, "product_name": "Kind of Blue", "quantity": 2, "unit_price": 34.99},
            {"product_id": 4, "product_name": "The Dark Side of the Moon", "quantity": 1, "unit_price": 39.99},
        ],
        "email_sent": True,
    }


def test_invoice_total_matches_items(monkeypatch):
    use_fake_db(monkeypatch)
    body = client.get("/orders/12/invoice", headers=auth_header()).json()
    items_sum = sum(Decimal(str(i["unit_price"])) * i["quantity"] for i in body["items"])
    assert items_sum == Decimal(str(body["total_price"]))


def test_invoice_items_read_from_the_requested_order(monkeypatch):
    cursor, _ = use_fake_db(monkeypatch)
    client.get("/orders/12/invoice", headers=auth_header())
    items_query, items_params = cursor.queries[1]
    assert "order_items" in items_query
    assert items_params == (12,)


def test_invoice_never_returns_password_or_full_card(monkeypatch):
    cursor, _ = use_fake_db(monkeypatch)
    response = client.get("/orders/12/invoice", headers=auth_header())
    text = response.text
    assert "password" not in text
    assert "card_number" not in text
    assert all("password" not in query for query, _ in cursor.queries)


def test_invoice_closes_the_connection(monkeypatch):
    _, connection = use_fake_db(monkeypatch)
    client.get("/orders/12/invoice", headers=auth_header())
    assert connection.closed


def test_invoice_with_non_numeric_id_returns_404():
    response = client.get("/orders/abc/invoice", headers=auth_header())
    assert response.status_code == 404


# --- SHOP-151: customers can only see their own invoices ---

def test_invoice_without_token_returns_401():
    assert client.get("/orders/12/invoice").status_code == 401


def test_invoice_with_invalid_token_returns_401():
    response = client.get("/orders/12/invoice", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_invoice_query_filters_by_logged_in_user(monkeypatch):
    cursor, _ = use_fake_db(monkeypatch)
    client.get("/orders/12/invoice", headers=auth_header(user_id=42))
    order_query, order_params = cursor.queries[0]
    assert "orders.user_id = %s" in order_query
    assert order_params == (12, 42)  # kullanıcı id'si token'dan geliyor


def test_someone_elses_invoice_returns_404(monkeypatch):
    # Sorgu user_id ile filtrelendiği için başkasının siparişi satır döndürmez
    cursor, _ = use_fake_db(monkeypatch, order_row=None)
    response = client.get("/orders/12/invoice", headers=auth_header(user_id=99))
    assert response.status_code == 404
    assert response.json() == {"detail": "Invoice not found"}
    assert len(cursor.queries) == 1  # ürünler hiç okunmadı


def test_missing_order_returns_same_404_as_someone_elses(monkeypatch):
    use_fake_db(monkeypatch, order_row=None)
    missing = client.get("/orders/999/invoice", headers=auth_header())
    assert missing.status_code == 404
    assert missing.json() == {"detail": "Invoice not found"}
