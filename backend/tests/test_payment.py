from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
def valid_card():
    return {
        "card_holder": "Zeynep Eker",
        "card_number": "4111111111111111",
        "expiry_month": 12,
        "expiry_year": 2028,
        "cvv": "123",
    }

def test_payment_does_not_return_card_number_or_cvv():

    response = client.post("/payment", json=valid_card())

    assert response.status_code == 200
    body = response.json()
    assert body["card_last4"] == "1111"
    assert "card_number" not in body
    assert "cvv" not in body

def test_declined_card_returns_402():
    card = valid_card()
    card["card_number"] = "4000000000000002"
    response = client.post("/payment", json=card)
    assert response.status_code == 402


def test_expired_card_returns_400():
    card = valid_card()
    card["expiry_month"] = 1
    card["expiry_year"] = 2026
    response = client.post("/payment", json=card)
    assert response.status_code == 400


def test_card_number_with_letters_returns_422():
    card = valid_card()
    card["card_number"] = "4111abcd11111111"
    response = client.post("/payment", json=card)
    assert response.status_code == 422