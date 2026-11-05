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

def test_default_order_is_by_product_id():

    response = client.get("/products")

    ids = [product["id"] for product in response.json()]
    assert ids == sorted(ids)

def test_sort_by_price_ascending():

    response = client.get("/products?sort=price_asc")

    assert response.status_code == 200
    prices = [float(product["price"]) for product in response.json()]
    assert prices == sorted(prices)
    assert response.json()[0]["name"] == "Jazz Classics CD"

def test_sort_by_price_descending():

    response = client.get("/products?sort=price_desc")

    assert response.status_code == 200
    prices = [float(product["price"]) for product in response.json()]
    assert prices == sorted(prices, reverse=True)
    assert response.json()[0]["name"] == "Bluetooth Turntable"

def test_sort_by_popularity():

    response = client.get("/products?sort=popularity")

    assert response.status_code == 200
    sold_counts = [product["sold_count"] for product in response.json()]
    assert sold_counts == sorted(sold_counts, reverse=True)
    assert response.json()[0]["name"] == "The Dark Side of the Moon"

def test_sort_works_with_category_filter():

    response = client.get("/products?category_name=Headphones&sort=price_asc")

    assert response.status_code == 200
    names = [product["name"] for product in response.json()]
    assert names == ["Studio Headphones", "Wireless Headphones"]

def test_invalid_sort_returns_400():

    response = client.get("/products?sort=abc")

    assert response.status_code == 400
    assert "price_asc" in response.json()["detail"]

def test_sort_rejects_sql_in_value():

    response = client.get("/products?sort=products.price; DROP TABLE products")

    assert response.status_code == 400
    assert len(client.get("/products").json()) == 8