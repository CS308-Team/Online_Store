// SHOP-124 (story SHOP-89): Tells the customer whether the PDF invoice was e-mailed.
// Reads invoice.email_sent from GET /orders/{id}/invoice (backend SHOP-153):
//   true      → the PDF was sent to the customer's e-mail
//   false     → sending failed; the order still stands (SHOP-155), so offer printing
//   missing   → the backend does not send e-mails yet: show nothing rather than a false promise
export default function InvoiceEmailNotice({ invoice }) {
  const sent = invoice?.email_sent;
  const email = invoice?.customer?.email;

  if (sent === true) {
    return (
      <p className="invoice-email is-sent" role="status">
        We’ve e-mailed a PDF copy of this invoice to {email ? <strong>{email}</strong> : "your e-mail address"}.
      </p>
    );
  }
  if (sent === false) {
    return (
      <p className="invoice-email is-failed" role="status">
        We couldn’t e-mail your invoice right now. Your order is confirmed — use Print invoice to keep a copy.
      </p>
    );
  }
  return null;
}
