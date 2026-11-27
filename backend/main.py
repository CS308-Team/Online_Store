import logging
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

from invoice_mail import build_invoice_pdf, send_invoice_email

load_dotenv()

logger = logging.getLogger(__name__)

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
# SHOP-156: an order moves processing -> in-transit -> delivered. Only these values are ever written.
# The DB has no CHECK on orders.status, so an endpoint that changes the status must validate it:
#     if new_status not in ORDER_STATUSES: raise HTTPException(status_code=400, ...)
ORDER_PROCESSING = "processing"
ORDER_IN_TRANSIT = "in-transit"
ORDER_DELIVERED = "delivered"
ORDER_STATUSES = (ORDER_PROCESSING, ORDER_IN_TRANSIT, ORDER_DELIVERED)
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

class CartItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)

class CartQuantityRequest(BaseModel):
    quantity: int = Field(ge=1)

class CartMergeRequest(BaseModel):
    items: list[CartItemRequest]


def get_stock(cursor, product_id: int) -> int:
    cursor.execute("SELECT quantity_in_stock FROM products WHERE id = %s", (product_id,))
    row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return row["quantity_in_stock"]

def get_cart_quantity(cursor, user_id: int, product_id: int) -> int:
    cursor.execute("SELECT quantity FROM cart_items WHERE user_id = %s AND product_id = %s",
                   (user_id, product_id))
    row = cursor.fetchone()
    return row["quantity"] if row else 0

def save_cart_quantity(cursor, user_id: int, product_id: int, quantity: int):
    # Satır yoksa ekler, varsa miktarı günceller (UNIQUE sayesinde)
    cursor.execute(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (%s, %s, %s) "
        "ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)",
        (user_id, product_id, quantity),
    )

def read_cart(cursor, user_id: int):
    cursor.execute(
        "SELECT cart_items.product_id, cart_items.quantity, products.name, products.price, "
        "products.quantity_in_stock "
        "FROM cart_items JOIN products ON cart_items.product_id = products.id "
        "WHERE cart_items.user_id = %s ORDER BY cart_items.id",
        (user_id,),
    )
    return cursor.fetchall()



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

# SHOP-91: müşteri kendi profilini görür (şifre asla dönmez)
@app.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT name, email, home_address FROM users WHERE id = %s",
                (current_user["id"],),
            )
            profile = cursor.fetchone()
    finally:
        connection.close()
    if profile is None:
        raise HTTPException(status_code=404, detail="User not found")
    return profile
# SHOP-81: rol kontrolünü denemek için örnek. Sadece Product Manager girebilir.
@app.get("/product-manager/check")
def product_manager_check(current_user: dict = Depends(require_role(PRODUCT_MANAGER))):
    return {"message": "Welcome, Product Manager", "user_id": current_user["id"]}

# SHOP-83: sepeti listele
@app.get("/cart")
def get_cart(current_user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            return read_cart(cursor, current_user["id"])
    finally:
        connection.close()

# SHOP-83: sepete ekle (varsa miktarı artırır)
@app.post("/cart/items", status_code=201)
def add_to_cart(data: CartItemRequest, current_user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            stock = get_stock(cursor, data.product_id)
            new_qty = get_cart_quantity(cursor, current_user["id"], data.product_id) + data.quantity
            if new_qty > stock:
                raise HTTPException(status_code=400, detail=f"Only {stock} left in stock")
            save_cart_quantity(cursor, current_user["id"], data.product_id, new_qty)
            connection.commit()
            return read_cart(cursor, current_user["id"])
    finally:
        connection.close()

# SHOP-83: miktarı değiştir
@app.patch("/cart/items/{product_id:int}")
def change_quantity(product_id: int, data: CartQuantityRequest,
                    current_user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            if get_cart_quantity(cursor, current_user["id"], product_id) == 0:
                raise HTTPException(status_code=404, detail="Product is not in the cart")
            stock = get_stock(cursor, product_id)
            if data.quantity > stock:
                raise HTTPException(status_code=400, detail=f"Only {stock} left in stock")
            save_cart_quantity(cursor, current_user["id"], product_id, data.quantity)
            connection.commit()
            return read_cart(cursor, current_user["id"])
    finally:
        connection.close()

# SHOP-83: sepetten çıkar
@app.delete("/cart/items/{product_id:int}")
def remove_from_cart(product_id: int, current_user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM cart_items WHERE user_id = %s AND product_id = %s",
                           (current_user["id"], product_id))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Product is not in the cart")
            connection.commit()
            return read_cart(cursor, current_user["id"])
    finally:
        connection.close()
# SHOP-83: girişten sonra misafir sepetini kullanıcının sepetine kat
@app.post("/cart/merge")
def merge_cart(data: CartMergeRequest, current_user: dict = Depends(get_current_user)):
    # Misafir listesinde aynı ürün iki kez varsa önce topla
    guest_totals = {}
    for item in data.items:
        guest_totals[item.product_id] = guest_totals.get(item.product_id, 0) + item.quantity

    adjusted = []  # stok yüzünden azaltılan ürünler
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            for product_id, guest_qty in guest_totals.items():
                cursor.execute("SELECT quantity_in_stock FROM products WHERE id = %s", (product_id,))
                row = cursor.fetchone()
                if row is None:
                    continue  # silinmiş ürün: atla
                stock = row["quantity_in_stock"]
                wanted = get_cart_quantity(cursor, current_user["id"], product_id) + guest_qty
                final = min(wanted, stock)
                if final < wanted:
                    adjusted.append({"product_id": product_id, "requested": wanted, "added": final})
                if final > 0:
                    save_cart_quantity(cursor, current_user["id"], product_id, final)
            connection.commit()
            return {"cart": read_cart(cursor, current_user["id"]), "adjusted": adjusted}
    finally:
        connection.close()


# SHOP-84: only logged-in customers can pay
@app.post("/payment")
def pay(data: PaymentRequest, current_user: dict = Depends(get_current_user)):
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
            "INSERT INTO orders (user_id, total_price, status, card_last4, delivery_address) "
            "VALUES (%s, %s, %s, %s, %s)",
            (current_user["id"], total, ORDER_PROCESSING, data.payment.card_number[-4:],
             data.delivery_address),
        )
        order_id = cursor.lastrowid

        for item in data.items:
            cursor.execute(
                "INSERT INTO deliveries (order_id, user_id, product_id , quantity, total_price, address)"
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (order_id, current_user["id"], item.product_id ,item.quantity , prices[item.product_id] * item.quantity ,data.delivery_address),    
            )
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

    # SHOP-155: runs after the commit, so a failed e-mail cannot cancel the order
    email_sent = email_invoice(order_id, current_user["id"])
    return {"order_id": order_id, "total_price": total, "status": ORDER_PROCESSING, "email_sent": email_sent}
# SHOP-84, SHOP-157 (story SHOP-90): a customer only ever sees their own orders, newest first.
# Same field names as the invoice, so the order history page and the invoice page share one shape.
@app.get("/orders")
def list_my_orders(current_user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # id DESC breaks ties: two orders placed in the same second still come newest first
            cursor.execute(
                "SELECT id AS order_id, created_at, status, total_price, delivery_address "
                "FROM orders WHERE user_id = %s ORDER BY created_at DESC, id DESC",
                (current_user["id"],),
            )
            orders = cursor.fetchall()

            # One query for the items of all orders, instead of one query per order
            cursor.execute(
                "SELECT order_items.order_id, order_items.product_id, products.name AS product_name, "
                "order_items.quantity, order_items.unit_price "
                "FROM order_items "
                "JOIN orders ON order_items.order_id = orders.id "
                "JOIN products ON order_items.product_id = products.id "
                "WHERE orders.user_id = %s ORDER BY order_items.id",
                (current_user["id"],),
            )
            items = cursor.fetchall()
    finally:
        connection.close()

    items_by_order = {}
    for item in items:
        order_id = item.pop("order_id")
        items_by_order.setdefault(order_id, []).append(item)
    for order in orders:
        order["items"] = items_by_order.get(order["order_id"], [])
    return orders


class OrderStatusUpdate(BaseModel):
    status : str = Field(pattern=r"^(processing|in-transit|delivered)$") #^ means that starting from the beginning , $to the end 
    #FASTAPI would return 422 error if the status is different than one of these 

NEXT_STATUS = {"processing":"in-transit", "in-transit":"delivered"}

@app.patch("/orders/{order_id:int}/status")
def change_status(order_id : int,  status_data : OrderStatusUpdate, current_user: dict = Depends(require_role(PRODUCT_MANAGER))):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT status FROM orders WHERE orders.id = %s FOR UPDATE", (order_id,)) # FOR UPDATE to avoide crashed if 2 manager press the same button at the same time
            order_stat = cursor.fetchone()
            if order_stat is None:
                raise HTTPException(status_code = 404 , detail= "Order not found")
            checker = False
            for key, value in NEXT_STATUS.items():
                if status_data.status == value and order_stat["status"] == key:
                    checker = True
            if checker == False:
                raise HTTPException(status_code = 400 , detail= "Transition is not possible")
            cursor.execute("UPDATE orders SET status = %s WHERE orders.id = %s ", (status_data.status,order_id))
            if status_data.status == "delivered":
                cursor.execute("UPDATE orders SET delivered_at = NOW() WHERE orders.id = %s ", (order_id,))
                cursor.execute("UPDATE deliveries SET completed = TRUE WHERE deliveries.order_id = %s", (order_id,))
            connection.commit()
    finally:
        connection.close()
    return {"old_status": order_stat["status"], "new_status": status_data.status}

def read_invoice(cursor, order_id: int, user_id: int) -> dict | None:
    """Invoice of one order if it belongs to user_id, otherwise None. Used by the endpoint and the e-mail."""
    cursor.execute(
        "SELECT orders.id, orders.created_at, orders.status, orders.total_price, "
        "orders.card_last4, orders.delivery_address, orders.email_sent, "
        "users.name, users.email, users.tax_id, users.home_address "
        "FROM orders JOIN users ON orders.user_id = users.id "
        "WHERE orders.id = %s AND orders.user_id = %s",
        (order_id, user_id),
    )
    order = cursor.fetchone()
    if order is None:
        return None

    cursor.execute(
        "SELECT order_items.product_id, products.name AS product_name, "
        "order_items.quantity, order_items.unit_price "
        "FROM order_items JOIN products ON order_items.product_id = products.id "
        "WHERE order_items.order_id = %s ORDER BY order_items.id",
        (order_id,),
    )
    items = cursor.fetchall()

    return {
        "order_id": order["id"],
        "created_at": order["created_at"],
        "status": order["status"],
        "total_price": order["total_price"],
        "card_last4": order["card_last4"],
        "delivery_address": order["delivery_address"],
        "customer": {
            "name": order["name"],
            "email": order["email"],
            "tax_id": order["tax_id"],
            "home_address": order["home_address"],
        },
        "items": items,
        "email_sent": bool(order["email_sent"]),  # SHOP-89: shown by the frontend's e-mail notice
    }


# SHOP-150, SHOP-151 (story SHOP-88): invoice of one order, only for the customer who placed it.
# Another customer's order answers 404 like a missing one, so order ids cannot be probed.
@app.get("/orders/{order_id:int}/invoice")
def get_invoice(order_id: int, current_user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            invoice = read_invoice(cursor, order_id, current_user["id"])
    finally:
        connection.close()

    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


# SHOP-152, SHOP-153, SHOP-155 (story SHOP-89): build the PDF and e-mail it after the order is saved.
# Never raises: the order is already committed, so an e-mail problem must not turn it into an error.
def email_invoice(order_id: int, user_id: int) -> bool:
    try:
        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                invoice = read_invoice(cursor, order_id, user_id)
                if invoice is None:
                    return False
                send_invoice_email(invoice, build_invoice_pdf(invoice))
                cursor.execute("UPDATE orders SET email_sent = TRUE WHERE id = %s", (order_id,))
            connection.commit()
        finally:
            connection.close()
        return True
    except Exception:
        logger.exception("Invoice e-mail for order %s failed; the order is kept", order_id)
        return False


@app.get("/deliveries")
def list_deliveries(current_user: dict = Depends(require_role(PRODUCT_MANAGER))):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM deliveries ORDER BY id")
            deliveries = cursor.fetchall()
    finally:
        connection.close()
    return deliveries
