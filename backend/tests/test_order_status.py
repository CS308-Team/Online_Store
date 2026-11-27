from fastapi.testclient import TestClient

from main import app, create_access_token, get_connection

client = TestClient(app)


def auth(role):
    return {"Authorization": f"Bearer {create_access_token(1, role)}"}


def make_order():
    """Creates a processing order with one delivery row and returns its id."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO orders (user_id, total_price, card_last4, delivery_address) "
                "VALUES (1, 10.00, '1111', 'Test address')"
            )
            order_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO deliveries (order_id, user_id, product_id, quantity, total_price, address) "
                "VALUES (%s, 1, 1, 1, 10.00, 'Test address')",
                (order_id,),
            )
        connection.commit()
    finally:
        connection.close()
    return order_id


def change(order_id, status, role="Product Manager"):
    return client.patch(f"/orders/{order_id}/status", json={"status": status}, headers=auth(role))


def test_status_moves_forward():
    order_id = make_order()
    assert change(order_id, "in-transit").status_code == 200
    assert change(order_id, "delivered").status_code == 200


def test_cannot_skip_a_step():
    order_id = make_order()
    assert change(order_id, "delivered").status_code == 400


def test_cannot_go_back_or_repeat():
    order_id = make_order()
    change(order_id, "in-transit")
    assert change(order_id, "in-transit").status_code == 400
    assert change(order_id, "processing").status_code == 400


def test_delivered_sets_date_and_completes_delivery():
    order_id = make_order()
    change(order_id, "in-transit")
    change(order_id, "delivered")
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT delivered_at FROM orders WHERE id = %s", (order_id,))
            assert cursor.fetchone()["delivered_at"] is not None
            cursor.execute("SELECT completed FROM deliveries WHERE order_id = %s", (order_id,))
            assert cursor.fetchone()["completed"] == 1
    finally:
        connection.close()


def test_unknown_order_returns_404():
    assert change(999999, "in-transit").status_code == 404


def test_unknown_status_returns_422():
    order_id = make_order()
    assert change(order_id, "shipped").status_code == 422


def test_other_roles_cannot_change_status():
    order_id = make_order()
    for role in ["Customer", "Sales Manager", "Support Agent"]:
        assert change(order_id, "in-transit", role).status_code == 403


def test_deliveries_filter_by_status():
    order_id = make_order()
    change(order_id, "in-transit")
    r = client.get("/deliveries?status=in-transit", headers=auth("Product Manager"))
    assert r.status_code == 200
    rows = r.json()
    assert any(row["order_id"] == order_id for row in rows)
    assert all(row["status"] == "in-transit" for row in rows)