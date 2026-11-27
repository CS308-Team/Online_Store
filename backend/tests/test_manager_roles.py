
from fastapi.testclient import TestClient

from main import app, create_access_token

client = TestClient(app)


def auth(role):
    token = create_access_token(1, role)
    return {"Authorization": f"Bearer {token}"}


def test_customer_cannot_see_deliveries():
    r = client.get("/deliveries", headers=auth("Customer"))
    assert r.status_code == 403



def test_no_token_cannot_see_deliveries():
    r = client.get("/deliveries")
    assert r.status_code == 401



def test_product_manager_can_see_deliveries():
    r = client.get("/deliveries", headers=auth("Product Manager"))
    assert r.status_code == 200