from fastapi.testclient import TestClient

from main import app, create_access_token

client = TestClient(app)

PRODUCT_ID = 8  # Bookshelf Speakers


def auth(role):
    return {"Authorization": f"Bearer {create_access_token(1, role)}"}


def set_stock(value, role="Product Manager", product_id=PRODUCT_ID):
    return client.patch(f"/products/{product_id}/stock", json={"stock": value}, headers=auth(role))


def test_product_manager_updates_stock():
    old = client.get(f"/products/{PRODUCT_ID}").json()["quantity_in_stock"]
    try:
        r = set_stock(42)
        assert r.status_code == 200
        assert r.json()["old_stock"] == old
        assert r.json()["new_stock"] == 42
        assert client.get(f"/products/{PRODUCT_ID}").json()["quantity_in_stock"] == 42
    finally:
        set_stock(old)


def test_stock_can_be_set_to_zero():
    old = client.get(f"/products/{PRODUCT_ID}").json()["quantity_in_stock"]
    try:
        assert set_stock(0).status_code == 200
    finally:
        set_stock(old)


def test_negative_stock_returns_422():
    assert set_stock(-3).status_code == 422


def test_unknown_product_returns_404():
    assert set_stock(10, product_id=999999).status_code == 404


def test_other_roles_cannot_update_stock():
    for role in ["Customer", "Sales Manager", "Support Agent"]:
        assert set_stock(10, role).status_code == 403


def test_no_token_cannot_update_stock():
    r = client.patch(f"/products/{PRODUCT_ID}/stock", json={"stock": 10})
    assert r.status_code == 401