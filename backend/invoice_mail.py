# SHOP-152, SHOP-153, SHOP-154 (story SHOP-89): invoice PDF and the e-mail that carries it.
# Built on the spikes in spikes/invoice_pdf_demo.py (SHOP-199) and spikes/email_demo.py (SHOP-200).
# Both functions take the same invoice dict that GET /orders/{id}/invoice returns.
import os
import smtplib
from email.message import EmailMessage
from io import BytesIO

import reportlab
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Helvetica cannot draw ı, ş, ğ, İ. Vera ships with reportlab and can, so names like "Anıl" print correctly.
_FONT_DIR = os.path.join(os.path.dirname(reportlab.__file__), "fonts")
pdfmetrics.registerFont(TTFont("Vera", os.path.join(_FONT_DIR, "Vera.ttf")))
pdfmetrics.registerFont(TTFont("VeraBd", os.path.join(_FONT_DIR, "VeraBd.ttf")))

STORE_NAME = "Online Music Store"


def money(value) -> str:
    return f"{float(value):,.2f} TL"


def build_invoice_pdf(invoice: dict) -> bytes:
    """SHOP-152: draws the invoice into memory and returns the PDF bytes."""
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.setTitle(f"Invoice #{invoice['order_id']}")
    width, height = A4
    customer = invoice["customer"]

    y = height - 25 * mm
    pdf.setFont("VeraBd", 18)
    pdf.drawString(20 * mm, y, f"{STORE_NAME} - Invoice")

    y -= 12 * mm
    pdf.setFont("Vera", 10)
    pdf.drawString(20 * mm, y, f"Invoice no: {invoice['order_id']}")
    pdf.drawString(110 * mm, y, f"Date: {invoice['created_at']:%d.%m.%Y %H:%M}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Customer: {customer['name']}")
    pdf.drawString(110 * mm, y, f"Tax ID: {customer['tax_id']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"E-mail: {customer['email']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Delivery address: {invoice['delivery_address']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Paid with card ending in {invoice['card_last4']}")

    y -= 14 * mm
    pdf.setFont("VeraBd", 10)
    pdf.drawString(20 * mm, y, "Product")
    pdf.drawRightString(130 * mm, y, "Quantity")
    pdf.drawRightString(160 * mm, y, "Unit price")
    pdf.drawRightString(190 * mm, y, "Amount")
    y -= 3 * mm
    pdf.line(20 * mm, y, 190 * mm, y)

    pdf.setFont("Vera", 10)
    for item in invoice["items"]:
        if y < 30 * mm:  # long orders continue on a new page
            pdf.showPage()
            pdf.setFont("Vera", 10)
            y = height - 25 * mm
        y -= 7 * mm
        pdf.drawString(20 * mm, y, item["product_name"])
        pdf.drawRightString(130 * mm, y, str(item["quantity"]))
        pdf.drawRightString(160 * mm, y, money(item["unit_price"]))
        pdf.drawRightString(190 * mm, y, money(item["unit_price"] * item["quantity"]))

    # The total is the one saved with the order, not a new sum, so it always matches the screen.
    y -= 4 * mm
    pdf.line(20 * mm, y, 190 * mm, y)
    y -= 8 * mm
    pdf.setFont("VeraBd", 12)
    pdf.drawRightString(160 * mm, y, "Total:")
    pdf.drawRightString(190 * mm, y, money(invoice["total_price"]))

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def smtp_settings() -> dict:
    """SHOP-154: SMTP settings come from backend/.env. Defaults match the local aiosmtpd test server."""
    return {
        "host": os.getenv("SMTP_HOST", "localhost"),
        "port": int(os.getenv("SMTP_PORT", "1025")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "use_tls": os.getenv("SMTP_USE_TLS", "false").lower() == "true",
        "sender": os.getenv("SMTP_FROM", "store@example.com"),
        "timeout": float(os.getenv("SMTP_TIMEOUT", "10")),
    }


def send_invoice_email(invoice: dict, pdf_bytes: bytes) -> None:
    """SHOP-153: e-mails the PDF to the customer. Raises on any SMTP error; the caller decides what to do."""
    settings = smtp_settings()
    customer = invoice["customer"]

    message = EmailMessage()
    message["From"] = settings["sender"]
    message["To"] = customer["email"]
    message["Subject"] = f"Your invoice for order #{invoice['order_id']}"
    message.set_content(
        f"Hello {customer['name']},\n\n"
        "Thank you for your order. Your invoice is attached as a PDF.\n\n"
        f"{STORE_NAME}"
    )
    message.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=f"invoice_{invoice['order_id']}.pdf",
    )

    # local_hostname: smtplib otherwise greets the server with the computer's name, and a name
    # with non-ASCII letters (e.g. "AnılYolcuPC") makes it crash before anything is sent.
    with smtplib.SMTP(settings["host"], settings["port"], local_hostname="localhost",
                      timeout=settings["timeout"]) as server:
        if settings["use_tls"]:
            server.starttls()
        if settings["user"]:
            server.login(settings["user"], settings["password"])
        server.send_message(message)
