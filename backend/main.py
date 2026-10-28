from fastapi import FastAPI, HTTPException
import pymysql

app = FastAPI()

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

@app.get("/products")
def list_products():
    connection = get_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM products")
        products = cursor.fetchall()
    connection.close()
    return products

@app.get("/products/{product_id}") # endpoint
def get_product(product_id: int):
    connection = get_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()
    connection.close()

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product