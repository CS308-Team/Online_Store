import os
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
import pymysql

import bcrypt
import jwt
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is missing. Copy backend/.env.example to backend/.env and set it.")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
# Rol adları, roles tablosundakilerle birebir aynı (02_seed.sql)
CUSTOMER = "Customer"
SALES_MANAGER = "Sales Manager"
PRODUCT_MANAGER = "Product Manager"
SUPPORT_AGENT = "Support Agent"
app = FastAPI()


#this shows the restrictions of the user while they are entering their information in the signup page
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    tax_id: str = Field(min_length=10, max_length=11)
    email: EmailStr
    home_address: str = Field(min_length=5)
    password: str = Field(min_length=8,max_length=72)
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

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
def check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),   # kullanıcı id'si (PyJWT string olmasını istiyor)
        "role": role,          # kullanıcının rolü
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),  # bitiş süresi
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
# auto_error=False: başlık hiç yoksa FastAPI'nin 403'ü yerine kendi 401'imizi dönelim
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    """'Authorization: Bearer <token>' başlığından kullanıcıyı okur. Yoksa ya da geçersizse 401."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not logged in",
                            headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired",
                            headers={"WWW-Authenticate": "Bearer"})
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token",
                            headers={"WWW-Authenticate": "Bearer"})
    return {"id": int(payload["sub"]), "role": payload["role"]}
def require_role(*allowed_roles: str):
    """Endpoint'te kullanım: Depends(require_role(PRODUCT_MANAGER)). Rol uymuyorsa 403."""
    def checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission for this action")
        return current_user
    return checker


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

            
            # SHOP-81: yeni kullanıcılar Customer rolüyle başlar
            cursor.execute("SELECT id FROM roles WHERE name = %s", (CUSTOMER,))
            customer_role_id = cursor.fetchone()["id"]
            # (c) Kullanıcıyı hash'lenmiş şifreyle ve Customer rolüyle kaydet
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
@app.post("/login")
def login(data: LoginRequest):
    email = data.email.lower()        # register'da da küçük harfle kaydediyoruz
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT users.id, users.password_hash, roles.name AS role "
                "FROM users JOIN roles ON users.role_id = roles.id "
                "WHERE users.email = %s",
                (email,),
            )
            user = cursor.fetchone()
    finally:
        connection.close()

    # Yanlış e-posta ve yanlış şifre için aynı mesaj
    if user is None or not check_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid e-mail or password",
                            headers={"WWW-Authenticate": "Bearer"})

    return {
        "access_token": create_access_token(user["id"], user["role"]),
        "token_type": "bearer",
        "role": user["role"],
    }
# SHOP-81: giriş yapmış herhangi bir kullanıcı
@app.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT users.id, users.name, users.email, users.tax_id, users.home_address, "
                "roles.name AS role "
                "FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = %s",
                (current_user["id"],),
            )
            user = cursor.fetchone()
    finally:
        connection.close()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# SHOP-81: rol kontrolünü denemek için örnek. Sadece Product Manager girebilir.
@app.get("/product-manager/check")
def product_manager_check(current_user: dict = Depends(require_role(PRODUCT_MANAGER))):
    return {"message": "Welcome, Product Manager", "user_id": current_user["id"]}