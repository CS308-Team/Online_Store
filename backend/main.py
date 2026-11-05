from fastapi import FastAPI, HTTPException
import pymysql

import bcrypt
from pydantic import BaseModel, EmailStr, Field

app = FastAPI()

#this shows the restrictions of the user while they are entering their information in the signup page
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    tax_id: str = Field(min_length=10, max_length=11)
    email: EmailStr
    home_address: str = Field(min_length=5)
    password: str = Field(min_length=8)

def get_connection():
    return pymysql.connect(
        host="localhost",
        port=3308,
        user="store",
        password="store",
        database="store",
        cursorclass=pymysql.cursors.DictCursor,
    )


@app.get("/")
def home():
    return {"message": "Hello from the online store!"}

# ORDER BY cannot use SQL parameters, so only these fixed strings may reach the query.
# products.id is the tie-breaker that keeps equal prices/sales in a stable order.
SORT_OPTIONS = {
    "price_asc": "products.price ASC, products.id ASC",
    "price_desc": "products.price DESC, products.id ASC",
    "popularity": "products.sold_count DESC, products.id ASC",
}
DEFAULT_ORDER = "products.id ASC"


@app.get("/products")
def list_products(category_name: str | None = None, sort: str | None = None):
    if sort is not None and sort not in SORT_OPTIONS:
        allowed = ", ".join(SORT_OPTIONS)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort option. Allowed values: {allowed}",
        )

    order_by = SORT_OPTIONS[sort] if sort is not None else DEFAULT_ORDER

    query = (
        "SELECT products.*, categories.name AS category "
        "FROM products "
        "JOIN categories ON products.category_id = categories.id "
    )
    params = ()
    if category_name is not None:
        query += "WHERE categories.name = %s "
        params = (category_name,)
    query += f"ORDER BY {order_by}"

    connection = get_connection()
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        products = cursor.fetchall()
    connection.close()
    return products

@app.get("/products/{product_id:int}") # endpoint
def get_product(product_id: int):
    connection = get_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()
    connection.close()

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.get("/categories")
def list_categories():
    connection = get_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM categories ORDER BY id ASC")
        categories = cursor.fetchall()
    connection.close()
    return categories

@app.post("/register", status_code = 201)
def register(data : RegisterRequest):
    return {"name": data.name, "email": data.email}
