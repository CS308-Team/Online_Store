# SHOP-199 spike: create a sample invoice PDF with the reportlab library.
# Run from the backend folder:  python spikes/invoice_pdf_demo.py
# Output: sample_invoice.pdf in the backend folder.

from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def build_invoice_pdf(order: dict) -> bytes:
    # Draw the invoice into memory and return the PDF bytes.
    # Returning bytes (not a file) lets us save it, send it by e-mail
    # or return it from an endpoint later (SHOP-88 / SHOP-89).
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Title and order details
    y = height - 25 * mm
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(20 * mm, y, "Online Music Store - Invoice")

    y -= 12 * mm
    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Invoice no: {order['order_id']}")
    pdf.drawString(110 * mm, y, f"Date: {order['date']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Customer: {order['customer_name']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Delivery address: {order['delivery_address']}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Paid with card ending in {order['card_last4']}")

    # Table header
    y -= 14 * mm
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(20 * mm, y, "Product")
    pdf.drawRightString(130 * mm, y, "Quantity")
    pdf.drawRightString(160 * mm, y, "Unit price")
    pdf.drawRightString(190 * mm, y, "Line total")
    y -= 3 * mm
    pdf.line(20 * mm, y, 190 * mm, y)

    # One row per item
    pdf.setFont("Helvetica", 10)
    total = 0
    for item in order["items"]:
        line_total = item["quantity"] * item["unit_price"]
        total += line_total
        y -= 7 * mm
        pdf.drawString(20 * mm, y, item["name"])
        pdf.drawRightString(130 * mm, y, str(item["quantity"]))
        pdf.drawRightString(160 * mm, y, f"${item['unit_price']:.2f}")
        pdf.drawRightString(190 * mm, y, f"${line_total:.2f}")

    # Total
    y -= 4 * mm
    pdf.line(20 * mm, y, 190 * mm, y)
    y -= 8 * mm
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(160 * mm, y, "Total:")
    pdf.drawRightString(190 * mm, y, f"${total:.2f}")

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


# Sample order with the same products as our seed data.
SAMPLE_ORDER = {
    "order_id": 1,
    "date": "2026-11-20",
    "customer_name": "Test Customer",
    "delivery_address": "Sabanci University, Tuzla, Istanbul",
    "card_last4": "1111",
    "items": [
        {"name": "Classic Turntable", "quantity": 2, "unit_price": 249.99},
        {"name": "Kind of Blue", "quantity": 1, "unit_price": 34.99},
    ],
}


if __name__ == "__main__":
    pdf_bytes = build_invoice_pdf(SAMPLE_ORDER)
    with open("sample_invoice.pdf", "wb") as f:
        f.write(pdf_bytes)
    print("sample_invoice.pdf created")
