# SHOP-156, SHOP-157 (story SHOP-90): order status values and GET /orders (own orders, newest first)
from datetime import datetime
from decimal import Decimal

from fastapi.testclient import TestClient

import main
from main import ORDER_STATUSES, app, create_access_token

client = TestClient(app)

ORDER_ROWS = [  # veritabanı bunları zaten en yeniden eskiye sıralı döndürür
    {"order_id": 14, "created_at": datetime(2026, 11, 26, 18, 0, 0), "status": "processing",
     "total_price": Decimal("249.99"), "delivery_address": "Tuzla, Istanbul"},
    {"order_id": 9, "created_at": datetime(2026, 11, 20, 10, 15, 0), "status": "in-transit",
     "total_price": Decimal("109.97"), "delivery_address": "Tuzla, Istanbul"},
    {"order_id": 3, "created_at": datetime(2026, 11, 2, 9, 0, 0), "status": "delivered",
     "total_price": Decimal("12.99"), "delivery_address": "Kadikoy, Istanbul"},
]

ITEM_ROWS = [
    {"order_id": 3, "product_id": 5, "product_name": "Jazz Classics CD", "quantity": 1, "unit_price": Decimal("12.99")},
    {"order_id": 9, "product_id": 3, "product_name": "Kind of Blue", "quantity": 2, "unit_price": Decimal("34.99")},
    {"order_id": 9, "product_id": 4, "product_name": "The Dark Side of the Moon", "quantity": 1, "unit_price": Decimal("39.99")},
    {"order_id": 14, "product_id": 1, "product_name": "Classic Turntable", "quantity": 1, "unit_price": Decimal("249.99")},
]


class FakeCursor:
    """Veritabanı yerine geçer: sorguları kaydeder, fetchall çağrılarına sırayla cevap verir."""

    def __init__(self, *results):
        self.results = list(results)
        self.queries = []

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchall(self):
        # endpoint satırları değiştirdiği için her testte kopya ver
        return [dict(row) for row in self.results.pop(0)]

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


def use_fake_db(monkeypatch, orders=ORDER_ROWS, items=ITEM_ROWS):
    cursor = FakeCursor(orders, items)
    connection = FakeConnection(cursor)
    monkeypatch.setattr(main, "get_connection", lambda: connection)
    return cursor, connection


def auth_header(user_id=1):
    return {"Authorization": "Bearer " + create_access_token(user_id, "Customer")}


# --- SHOP-157: GET /orders returns only the user's own orders, newest first ---

def test_orders_without_token_returns_401():
    assert client.get("/orders").status_code == 401


def test_orders_with_invalid_token_returns_401():
    response = client.get("/orders", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_orders_returns_each_order_with_its_items(monkeypatch):
    use_fake_db(monkeypatch)
    response = client.get("/orders", headers=auth_header())
    assert response.status_code == 200
    assert response.json()[1] == {
        "order_id": 9,
        "created_at": "2026-11-20T10:15:00",
        "status": "in-transit",
        "total_price": 109.97,
        "delivery_address": "Tuzla, Istanbul",
        "items": [
            {"product_id": 3, "product_name": "Kind of Blue", "quantity": 2, "unit_price": 34.99},
            {"product_id": 4, "product_name": "The Dark Side of the Moon", "quantity": 1, "unit_price": 39.99},
        ],
    }


def test_items_are_grouped_under_the_right_order(monkeypatch):
    use_fake_db(monkeypatch)
    body = client.get("/orders", headers=auth_header()).json()
    products = {order["order_id"]: [i["product_id"] for i in order["items"]] for order in body}
    assert products == {14: [1], 9: [3, 4], 3: [5]}


def test_items_do_not_repeat_the_order_id(monkeypatch):
    use_fake_db(monkeypatch)
    body = client.get("/orders", headers=auth_header()).json()
    assert all("order_id" not in item for order in body for item in order["items"])


def test_orders_keep_newest_first_order(monkeypatch):
    use_fake_db(monkeypatch)
    body = client.get("/orders", headers=auth_header()).json()
    assert [order["order_id"] for order in body] == [14, 9, 3]


def test_orders_query_sorts_newest_first_with_tie_breaker(monkeypatch):
    cursor, _ = use_fake_db(monkeypatch)
    client.get("/orders", headers=auth_header())
    orders_query, _ = cursor.queries[0]
    assert "ORDER BY created_at DESC, id DESC" in orders_query  # aynı saniyedeki iki sipariş


def test_both_queries_use_the_logged_in_user(monkeypatch):
    cursor, _ = use_fake_db(monkeypatch)
    client.get("/orders", headers=auth_header(user_id=42))
    (orders_query, orders_params), (items_query, items_params) = cursor.queries
    assert "WHERE user_id = %s" in orders_query
    assert orders_params == (42,)  # id token'dan geliyor
    assert "WHERE orders.user_id = %s" in items_query
    assert items_params == (42,)  # başkasının ürün satırları da okunmuyor


def test_orders_uses_two_queries_not_one_per_order(monkeypatch):
    cursor, _ = use_fake_db(monkeypatch)
    client.get("/orders", headers=auth_header())
    assert len(cursor.queries) == 2


def test_customer_with_no_orders_gets_empty_list(monkeypatch):
    use_fake_db(monkeypatch, orders=[], items=[])
    response = client.get("/orders", headers=auth_header())
    assert response.status_code == 200
    assert response.json() == []


def test_order_without_items_gets_empty_item_list(monkeypatch):
    use_fake_db(monkeypatch, orders=ORDER_ROWS[:1], items=[])
    body = client.get("/orders", headers=auth_header()).json()
    assert body[0]["items"] == []


def test_orders_closes_the_connection(monkeypatch):
    _, connection = use_fake_db(monkeypatch)
    client.get("/orders", headers=auth_header())
    assert connection.closed


def test_orders_never_return_card_or_password(monkeypatch):
    cursor, _ = use_fake_db(monkeypatch)
    text = client.get("/orders", headers=auth_header()).text
    assert "card" not in text
    assert "password" not in text
    assert all("password" not in query for query, _ in cursor.queries)


# --- SHOP-156: order status field (processing, in-transit, delivered) ---

def test_order_statuses_are_the_three_from_jira():
    assert ORDER_STATUSES == ("processing", "in-transit", "delivered")


def test_orders_returns_every_status_unchanged(monkeypatch):
    use_fake_db(monkeypatch)
    body = client.get("/orders", headers=auth_header()).json()
    assert [order["status"] for order in body] == ["processing", "in-transit", "delivered"]


class OrderCursor:
    """POST /orders için: her ürün 34.99 fiyatlı ve stokta 20 tane."""

    def __init__(self):
        self.queries = []
        self.lastrowid = 15

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchone(self):
        return {"price": Decimal("34.99"), "quantity_in_stock": 20}


class OrderConnection:
    def __init__(self):
        self._cursor = OrderCursor()

    def cursor(self):
        return self._cursor

    def begin(self):
        pass

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


ORDER_BODY = {
    "items": [{"product_id": 3, "quantity": 1}],
    "delivery_address": "Orta Mahalle, Tuzla, Istanbul",
    "payment": {
        "card_holder": "Anil Yolcu", "card_number": "4111111111111111",
        "expiry_month": 12, "expiry_year": 2028, "cvv": "123",
    },
}


def test_new_order_is_saved_as_processing(monkeypatch):
    connection = OrderConnection()
    monkeypatch.setattr(main, "get_connection", lambda: connection)
    monkeypatch.setattr(main, "email_invoice", lambda order_id, user_id: True)

    response = client.post("/orders", json=ORDER_BODY, headers=auth_header())
    assert response.status_code == 201
    assert response.json()["status"] == "processing"

    insert_query, insert_params = next(
        (q, p) for q, p in connection._cursor.queries if q.startswith("INSERT INTO orders")
    )
    assert "status" in insert_query
    assert "processing" in insert_params  # DB'nin varsayılanına bırakılmıyor
