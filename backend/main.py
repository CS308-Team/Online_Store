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
    password: str = Field(min_length=8,max_length=72)

def get_connection():
    return pymysql.connect(
        host="localhost",
        port=3308,
        user="store",
        password="store",
        database="store",
        cursorclass=pymysql.cursors.DictCursor,
    )
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


@app.get("/")
def home():
    return {"message": "Hello from the online store!"}

@app.get("/products")
def list_products(category_name: str | None = None):
    connection = get_connection()
    with connection.cursor() as cursor:
        if category_name is not None:
            cursor.execute(
                "SELECT products.*, categories.name AS category "
                "FROM products "
                "JOIN categories ON products.category_id = categories.id "
                "WHERE categories.name = %s "
                "ORDER BY products.id ASC",
                (category_name,),
            )
        else:
            cursor.execute(
                "SELECT products.*, categories.name AS category "
                "FROM products "
                "JOIN categories ON products.category_id = categories.id "
                "ORDER BY products.id ASC"
            )
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

@app.post("/register", status_code=201)
def register(data: RegisterRequest):
    email = data.email.lower()                       # (a)
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # (b) Bu e-posta zaten kayıtlı mı?
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone() is not None:
                raise HTTPException(status_code=409, detail="This e-mail is already registered")

            # (c) Kullanıcıyı hash'lenmiş şifreyle kaydet
            cursor.execute(
                "INSERT INTO users (name, tax_id, email, home_address, password_hash) "
                "VALUES (%s, %s, %s, %s, %s)",
                (data.name, data.tax_id, email, data.home_address,
                 hash_password(data.password)),
            )
            user_id = cursor.lastrowid               # (d)
        connection.commit()                          # (e)
    finally:
        connection.close()                           # (f)

    # (g) Şifreyi veya hash'i asla geri gönderme
    return {"id": user_id, "name": data.name, "email": email}