def names(response):
    return [p["name"] for p in response.json()]


def test_list_returns_all_products(client):
    response = client.get("/products")
    assert response.status_code == 200
    assert len(response.json()) == 3


def test_search_by_name(client):
    assert names(client.get("/products?search=turntable")) == ["Classic Turntable"]


def test_search_by_description(client):
    assert names(client.get("/products?search=bluetooth")) == ["Wireless Headphones"]


def test_search_is_case_insensitive(client):
    assert len(client.get("/products?search=HEADPHONES").json()) == 2


def test_search_with_no_match_returns_empty_list(client):
    assert client.get("/products?search=xyz").json() == []


def test_out_of_stock_product_is_searchable(client):
    data = client.get("/products?search=studio").json()
    assert data[0]["name"] == "Studio Headphones"
    assert data[0]["in_stock"] is False


def test_sort_by_price_ascending(client):
    assert names(client.get("/products?sort=price_asc")) == [
        "Studio Headphones", "Wireless Headphones", "Classic Turntable"]


def test_sort_by_price_descending(client):
    assert names(client.get("/products?sort=price_desc")) == [
        "Classic Turntable", "Wireless Headphones", "Studio Headphones"]


def test_sort_by_popularity(client):
    assert names(client.get("/products?sort=popularity")) == [
        "Studio Headphones", "Wireless Headphones", "Classic Turntable"]


def test_search_and_sort_together(client):
    assert names(client.get("/products?search=headphones&sort=price_desc")) == [
        "Wireless Headphones", "Studio Headphones"]


def test_invalid_sort_value_is_rejected(client):
    assert client.get("/products?sort=abc").status_code == 422


def test_cost_is_not_exposed(client):
    assert "cost" not in client.get("/products").json()[0]
