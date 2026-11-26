# SHOP-152, SHOP-153, SHOP-154, SHOP-155 (story SHOP-89): invoice PDF by e-mail after payment
import smtplib
import socket
from datetime import datetime
from decimal import Decimal
from email import message_from_bytes

from aiosmtpd.controller import Controller
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

import invoice_mail
import main
from invoice_mail import build_invoice_pdf, send_invoice_email, smtp_settings
from main import app, create_access_token

client = TestClient(app)

INVOICE = {
    "order_id": 12,
    "created_at": datetime(2026, 11, 26, 14, 30, 0),
    "status": "processing",
    "total_price": Decimal("109.97"),
    "card_last4": "1111",
    "delivery_address": "Orta Mahalle, Tuzla, Istanbul",
    "customer": {
        "name": "Anıl Yolcu",
        "email": "customer@example.com",
        "tax_id": "1111111111",
        "home_address": "Tuzla, Istanbul",
    },
    "items": [
        {"product_id": 3, "product_name": "Kind of Blue", "quantity": 2, "unit_price": Decimal("34.99")},
        {"product_id": 4, "product_name": "The Dark Side of the Moon", "quantity": 1, "unit_price": Decimal("39.99")},
    ],
    "email_sent": False,
}


def drawn_text(monkeypatch, invoice):
    """Builds the PDF and returns every string drawn on it (the PDF bytes themselves are compressed)."""
    texts = []
    original_left, original_right = canvas.Canvas.drawString, canvas.Canvas.drawRightString

    def left(self, x, y, text, *args, **kwargs):
        texts.append(text)
        return original_left(self, x, y, text, *args, **kwargs)

    def right(self, x, y, text, *args, **kwargs):
        texts.append(text)
        return original_right(self, x, y, text, *args, **kwargs)

    monkeypatch.setattr(canvas.Canvas, "drawString", left)
    monkeypatch.setattr(canvas.Canvas, "drawRightString", right)
    pdf_bytes = build_invoice_pdf(invoice)
    return pdf_bytes, texts


# --- SHOP-152: invoice PDF ---

def test_pdf_is_a_real_pdf():
    pdf_bytes = build_invoice_pdf(INVOICE)
    assert pdf_bytes.startswith(b"%PDF")
    assert pdf_bytes.rstrip().endswith(b"%%EOF")


def test_pdf_shows_order_customer_items_and_total(monkeypatch):
    _, texts = drawn_text(monkeypatch, INVOICE)
    assert "Invoice no: 12" in texts
    assert "Date: 26.11.2026 14:30" in texts
    assert "Customer: Anıl Yolcu" in texts  # Türkçe karakter bozulmadan
    assert "Tax ID: 1111111111" in texts
    assert "Delivery address: Orta Mahalle, Tuzla, Istanbul" in texts
    assert "Paid with card ending in 1111" in texts
    assert "Kind of Blue" in texts
    assert "The Dark Side of the Moon" in texts
    assert "69.98 TL" in texts  # 2 x 34.99
    assert "109.97 TL" in texts  # siparişte kayıtlı toplam


def test_pdf_never_contains_full_card_number(monkeypatch):
    _, texts = drawn_text(monkeypatch, INVOICE)
    assert not any("4111111111111111" in text for text in texts)


def test_long_order_continues_on_new_page():
    many = dict(INVOICE, items=[
        {"product_id": i, "product_name": f"Record {i}", "quantity": 1, "unit_price": Decimal("10.00")}
        for i in range(60)
    ])
    assert build_invoice_pdf(many).count(b"/Type /Page\n") >= 2


# --- SHOP-154: SMTP settings come from .env ---

def test_smtp_defaults_point_to_local_test_server(monkeypatch):
    for name in ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_USE_TLS", "SMTP_FROM"]:
        monkeypatch.delenv(name, raising=False)
    settings = smtp_settings()
    assert (settings["host"], settings["port"]) == ("localhost", 1025)
    assert settings["user"] == ""
    assert settings["use_tls"] is False


def test_smtp_settings_read_from_environment(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.gmail.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "store@gmail.com")
    monkeypatch.setenv("SMTP_PASSWORD", "app-password")
    monkeypatch.setenv("SMTP_USE_TLS", "true")
    monkeypatch.setenv("SMTP_FROM", "store@gmail.com")
    settings = smtp_settings()
    assert settings["host"] == "smtp.gmail.com"
    assert settings["port"] == 587
    assert settings["user"] == "store@gmail.com"
    assert settings["password"] == "app-password"
    assert settings["use_tls"] is True
    assert settings["sender"] == "store@gmail.com"


# --- SHOP-153: e-mail the PDF ---

class FakeSMTP:
    """smtplib.SMTP yerine geçer: gönderilen mesajı ve çağrıları kaydeder."""
    instances = []

    def __init__(self, host, port, local_hostname=None, timeout=None):
        self.host, self.port, self.timeout = host, port, timeout
        self.local_hostname = local_hostname
        self.calls = []
        self.sent = None
        FakeSMTP.instances.append(self)

    def starttls(self):
        self.calls.append("starttls")

    def login(self, user, password):
        self.calls.append(("login", user, password))

    def send_message(self, message):
        self.sent = message

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def use_fake_smtp(monkeypatch):
    FakeSMTP.instances = []
    monkeypatch.setattr(invoice_mail.smtplib, "SMTP", FakeSMTP)


def test_email_goes_to_customer_with_pdf_attached(monkeypatch):
    use_fake_smtp(monkeypatch)
    monkeypatch.setenv("SMTP_FROM", "store@example.com")
    send_invoice_email(INVOICE, b"%PDF-fake")
    message = FakeSMTP.instances[0].sent
    assert message["To"] == "customer@example.com"
    assert message["From"] == "store@example.com"
    assert message["Subject"] == "Your invoice for order #12"
    attachments = list(message.iter_attachments())
    assert len(attachments) == 1
    assert attachments[0].get_content_type() == "application/pdf"
    assert attachments[0].get_filename() == "invoice_12.pdf"
    assert attachments[0].get_content() == b"%PDF-fake"


def test_email_uses_tls_and_login_when_configured(monkeypatch):
    use_fake_smtp(monkeypatch)
    monkeypatch.setenv("SMTP_HOST", "smtp.gmail.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "store@gmail.com")
    monkeypatch.setenv("SMTP_PASSWORD", "app-password")
    monkeypatch.setenv("SMTP_USE_TLS", "true")
    send_invoice_email(INVOICE, b"%PDF-fake")
    server = FakeSMTP.instances[0]
    assert (server.host, server.port) == ("smtp.gmail.com", 587)
    assert server.local_hostname == "localhost"  # bilgisayar adındaki Türkçe harf EHLO'yu bozmasın
    assert server.calls == ["starttls", ("login", "store@gmail.com", "app-password")]


def test_email_skips_login_without_user(monkeypatch):
    use_fake_smtp(monkeypatch)
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.setenv("SMTP_USE_TLS", "false")
    send_invoice_email(INVOICE, b"%PDF-fake")
    assert FakeSMTP.instances[0].calls == []


def free_port():
    with socket.socket() as s:
        s.bind(("localhost", 0))
        return s.getsockname()[1]


class Inbox:
    def __init__(self):
        self.messages = []

    async def handle_DATA(self, server, session, envelope):
        self.messages.append(envelope)
        return "250 OK"


def test_email_really_arrives_at_smtp_server(monkeypatch):
    # Gerçek bir SMTP sunucusu (aiosmtpd, spike'taki ile aynı) açıp e-postayı ona gönderir
    inbox = Inbox()
    port = free_port()
    controller = Controller(inbox, hostname="localhost", port=port)
    controller.start()
    try:
        monkeypatch.setenv("SMTP_HOST", "localhost")
        monkeypatch.setenv("SMTP_PORT", str(port))
        monkeypatch.delenv("SMTP_USER", raising=False)
        monkeypatch.setenv("SMTP_USE_TLS", "false")
        pdf_bytes = build_invoice_pdf(INVOICE)
        send_invoice_email(INVOICE, pdf_bytes)
    finally:
        controller.stop()

    assert len(inbox.messages) == 1
    envelope = inbox.messages[0]
    assert envelope.rcpt_tos == ["customer@example.com"]
    received = message_from_bytes(envelope.content)
    pdf_part = next(part for part in received.walk() if part.get_content_type() == "application/pdf")
    assert pdf_part.get_payload(decode=True) == pdf_bytes


def test_email_error_is_raised_to_caller(monkeypatch):
    # Sunucu yoksa send_invoice_email hata fırlatır; yakalamak email_invoice'un işi
    monkeypatch.setenv("SMTP_HOST", "localhost")
    monkeypatch.setenv("SMTP_PORT", str(free_port()))  # kimse dinlemiyor
    monkeypatch.setenv("SMTP_TIMEOUT", "2")
    try:
        send_invoice_email(INVOICE, b"%PDF-fake")
        assert False, "should have raised"
    except OSError:
        pass


# --- email_invoice: reads the order, sends, marks email_sent ---

ORDER_ROW = {
    "id": 12, "created_at": INVOICE["created_at"], "status": "processing",
    "total_price": INVOICE["total_price"], "card_last4": "1111",
    "delivery_address": INVOICE["delivery_address"], "email_sent": 0,
    "name": "Anıl Yolcu", "email": "customer@example.com",
    "tax_id": "1111111111", "home_address": "Tuzla, Istanbul",
}


class FakeCursor:
    def __init__(self, order_row=ORDER_ROW, item_rows=INVOICE["items"]):
        self.order_row = order_row
        self.item_rows = item_rows
        self.queries = []

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchone(self):
        return self.order_row

    def fetchall(self):
        return self.item_rows

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.committed = False
        self.closed = False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


def use_fake_db(monkeypatch, cursor):
    connection = FakeConnection(cursor)
    monkeypatch.setattr(main, "get_connection", lambda: connection)
    return connection


def updates(cursor):
    return [q for q, _ in cursor.queries if q.startswith("UPDATE orders SET email_sent")]


def test_email_invoice_marks_order_as_sent(monkeypatch):
    cursor = FakeCursor()
    connection = use_fake_db(monkeypatch, cursor)
    sent = []
    monkeypatch.setattr(main, "send_invoice_email", lambda invoice, pdf: sent.append((invoice, pdf)))

    assert main.email_invoice(12, 1) is True
    assert sent[0][0]["customer"]["email"] == "customer@example.com"
    assert sent[0][1].startswith(b"%PDF")
    assert len(updates(cursor)) == 1
    assert connection.committed and connection.closed


def test_email_invoice_reads_only_the_customers_own_order(monkeypatch):
    cursor = FakeCursor()
    use_fake_db(monkeypatch, cursor)
    monkeypatch.setattr(main, "send_invoice_email", lambda invoice, pdf: None)
    main.email_invoice(12, 42)
    assert cursor.queries[0][1] == (12, 42)


# --- SHOP-155: an e-mail failure must not cancel the order ---

def failing_send(invoice, pdf):
    raise smtplib.SMTPException("server down")


def test_email_failure_returns_false_and_does_not_raise(monkeypatch):
    cursor = FakeCursor()
    connection = use_fake_db(monkeypatch, cursor)
    monkeypatch.setattr(main, "send_invoice_email", failing_send)

    assert main.email_invoice(12, 1) is False
    assert updates(cursor) == []  # email_sent FALSE kalır
    assert connection.closed


def test_database_failure_during_email_returns_false(monkeypatch):
    def broken():
        raise RuntimeError("database down")
    monkeypatch.setattr(main, "get_connection", broken)
    assert main.email_invoice(12, 1) is False


class OrderCursor:
    """POST /orders için: her ürün 34.99 fiyatlı ve stokta 20 tane."""

    def __init__(self):
        self.queries = []
        self.lastrowid = 12

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchone(self):
        return {"price": Decimal("34.99"), "quantity_in_stock": 20}


class OrderConnection:
    def __init__(self):
        self._cursor = OrderCursor()
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self._cursor

    def begin(self):
        pass

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        pass


ORDER_BODY = {
    "items": [{"product_id": 3, "quantity": 2}],
    "delivery_address": "Orta Mahalle, Tuzla, Istanbul",
    "payment": {
        "card_holder": "Anil Yolcu", "card_number": "4111111111111111",
        "expiry_month": 12, "expiry_year": 2028, "cvv": "123",
    },
}
AUTH = {"Authorization": "Bearer " + create_access_token(1, "Customer")}


def test_order_succeeds_when_email_fails(monkeypatch):
    connection = OrderConnection()
    monkeypatch.setattr(main, "get_connection", lambda: connection)
    monkeypatch.setattr(main, "email_invoice", lambda order_id, user_id: False)

    response = client.post("/orders", json=ORDER_BODY, headers=AUTH)
    assert response.status_code == 201
    assert response.json() == {
        "order_id": 12, "total_price": 69.98, "status": "processing", "email_sent": False,
    }
    assert connection.committed
    assert not connection.rolled_back


def test_order_reports_email_sent(monkeypatch):
    monkeypatch.setattr(main, "get_connection", lambda: OrderConnection())
    monkeypatch.setattr(main, "email_invoice", lambda order_id, user_id: True)
    response = client.post("/orders", json=ORDER_BODY, headers=AUTH)
    assert response.status_code == 201
    assert response.json()["email_sent"] is True


def test_email_is_sent_after_the_order_is_committed(monkeypatch):
    connection = OrderConnection()
    monkeypatch.setattr(main, "get_connection", lambda: connection)
    seen = {}

    def record(order_id, user_id):
        seen["committed_before_email"] = connection.committed
        seen["args"] = (order_id, user_id)
        return True

    monkeypatch.setattr(main, "email_invoice", record)
    client.post("/orders", json=ORDER_BODY, headers=AUTH)
    assert seen == {"committed_before_email": True, "args": (12, 1)}


def test_invoice_endpoint_reports_failed_email(monkeypatch):
    use_fake_db(monkeypatch, FakeCursor(order_row=dict(ORDER_ROW, email_sent=0)))
    body = client.get("/orders/12/invoice", headers=AUTH).json()
    assert body["email_sent"] is False
