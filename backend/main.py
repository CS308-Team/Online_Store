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

#card information restrictions 
class PaymentRequest(BaseModel):
    card_holder: str = Field(min_length=2, max_length=100)
    card_number: str = Field(pattern=r"^\d{16}$")
    expiry_month: int = Field(ge=1, le=12)
    expiry_year: int = Field(ge=2026)
    cvv: str = Field(pattern=r"^\d{3}$")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class OrderRequest(BaseModel):
    items: list[OrderItemRequest] = Field(min_length=1)
    delivery_address: str = Field(min_length=5)
    payment: PaymentRequest

def get_connection():
    return pymysql.connect(
        host="localhost",
        port=3308,
        user="store",
        password="store",
        database="store",
        cursorclass=pymysql.cursors.DictCursor,
    )

def is_card_expired(month: int, year: int) -> bool :
    today = datetime.now()
    if year < today.year:
        return True
    if year == today.year and month < today.month:
        return True
    return False

DECLINED_TEST_CARD = "4000000000000002"
def mock_bank_approves( card_number : str ) -> bool:
    if card_number == DECLINED_TEST_CARD:
        return False
    return True

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

# ORDER BY cannot use SQL parameters, so only these fixed strings may reach the query.
# products.id is the tie-breaker that keeps equal prices/sales in a stable order.
SORT_OPTIONS = {
    "price_asc": "products.price ASC, products.id ASC",
    "price_desc": "products.price DESC, products.id ASC",
    "popularity": "products.sold_count DESC, products.id ASC",
}
DEFAULT_ORDER = "products.id ASC"


# %, _ and \ are special in LIKE, so escape them to search for the text as typed.
def escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@app.get("/products")
def list_products(
    category_name: str | None = None,
    sort: str | None = None,
    search: str | None = None,
):
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
    conditions = []
    params = []
    if category_name is not None:
        conditions.append("categories.name = %s")
        params.append(category_name)
    if search is not None:
        pattern = f"%{escape_like(search.strip())}%"
        conditions.append("(products.name LIKE %s OR products.description LIKE %s)")
        params += [pattern, pattern]
    if conditions:
        query += "WHERE " + " AND ".join(conditions) + " "
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

@app.post("/payment")
def pay(data: PaymentRequest):
    if is_card_expired(data.expiry_month, data.expiry_year):
        raise HTTPException(status_code=400, detail="Card has expired")
    if not mock_bank_approves(data.card_number):
        raise HTTPException(status_code=402, detail= "Payment declined by the bank")
    card_last4 = data.card_number[-4:]
    return {"status": "approved", "card_last4" : card_last4 }

@app.post("/orders", status_code=201)
def create_order(data: OrderRequest, current_user: dict = Depends(get_current_user)):
    if is_card_expired(data.payment.expiry_month, data.payment.expiry_year):
        raise HTTPException(status_code=400, detail="Card has expired")
    if not mock_bank_approves(data.payment.card_number):
        raise HTTPException(status_code=402, detail="Payment declined by the bank")

    connection = get_connection()
    cursor = connection.cursor()
    try:
        connection.begin()

        total = 0
        prices = {}
        for item in data.items:
            cursor.execute(
                "SELECT price, quantity_in_stock FROM products WHERE id = %s FOR UPDATE",
                (item.product_id,),
            )
            product = cursor.fetchone()
            if product is None:
                raise HTTPException(status_code=404, detail="Product not found")
            if product["quantity_in_stock"] < item.quantity:
                raise HTTPException(status_code=409, detail="Not enough stock")
            prices[item.product_id] = product["price"]
            total += product["price"] * item.quantity

        cursor.execute(
            "INSERT INTO orders (user_id, total_price, card_last4, delivery_address) "
            "VALUES (%s, %s, %s, %s)",
            (current_user["id"], total, data.payment.card_number[-4:], data.delivery_address),
        )
        order_id = cursor.lastrowid

        for item in data.items:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price) "
                "VALUES (%s, %s, %s, %s)",
                (order_id, item.product_id, item.quantity, prices[item.product_id]),
            )
            cursor.execute(
                "UPDATE products SET quantity_in_stock = quantity_in_stock - %s, "
                "sold_count = sold_count + %s WHERE id = %s",
                (item.quantity, item.quantity, item.product_id),
            )

        cursor.execute("DELETE FROM cart_items WHERE user_id = %s", (current_user["id"],))

        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    return {"order_id": order_id, "total_price": total, "status": "processing"}