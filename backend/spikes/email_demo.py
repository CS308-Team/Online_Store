# SHOP-200 spike: send an e-mail with the invoice PDF attached.
# It uses a local test SMTP server, so no account or password is needed
# and no real e-mail leaves the computer.
#
# Terminal 1 (backend folder, venv active), start the test server:
#     python -m aiosmtpd -n -l localhost:1025
# Terminal 2 (backend folder, venv active), send the e-mail:
#     python spikes/email_demo.py
# The full e-mail, with the PDF attachment, appears in terminal 1.

import smtplib
from email.message import EmailMessage

from invoice_pdf_demo import SAMPLE_ORDER, build_invoice_pdf

SMTP_HOST = "localhost"
SMTP_PORT = 1025


def send_invoice_email(to_address: str, order: dict) -> None:
    message = EmailMessage()
    message["From"] = "store@example.com"
    message["To"] = to_address
    message["Subject"] = f"Your invoice for order #{order['order_id']}"
    message.set_content(
        f"Hello {order['customer_name']},\n\n"
        "Thank you for your order. Your invoice is attached as a PDF.\n\n"
        "Online Music Store"
    )

    pdf_bytes = build_invoice_pdf(order)
    message.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=f"invoice_{order['order_id']}.pdf",
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.send_message(message)


if __name__ == "__main__":
    send_invoice_email("customer@example.com", SAMPLE_ORDER)
    print("E-mail sent. Check the terminal where the test SMTP server runs.")
