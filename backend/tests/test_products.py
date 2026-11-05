from fastapi.testclient import TestClient
from main import app #we say app since we said app = = FastAPI() in the main so that now we get our app 

client = TestClient(app)

def test_get_product_by_id():

    response = client.get("/products/3")

    assert response.status_code == 200
    assert response.json()["name"] == "Kind of Blue"

def test_list_products_returns_all_products():

    response = client.get("/products")

    assert response.status_code == 200
    assert len(response.json()) == 8

def test_filter_by_category():

    response = client.get("/products?category_name=Turntables")

    assert len(response.json()) == 2
    assert response.json()[0]["name"] == "Classic Turntable"

def test_filter_by_unknown_category_returns_empty_list():

    response= client.get("/products?category_name=Guitars")

    assert response.json() == []

def test_list_categories():
    response = client.get("/categories")

    assert len(response.json()) == 5