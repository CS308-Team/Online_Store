import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInvoice } from "../api/orders";
import { useAuth } from "../auth/useAuth";
import VinylLoader from "../components/VinylLoader";
import { formatPrice } from "../utils/format";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function InvoicePage() {
  const { orderId } = useParams();
  const { auth } = useAuth();
  const [state, setState] = useState({ orderId: null, invoice: null, error: null });

  useEffect(() => {
    let active = true;
    getInvoice(orderId, auth.token)
      .then((invoice) => active && setState({ orderId, invoice, error: null }))
      .catch((error) => active && setState({ orderId, invoice: null, error }));
    return () => { active = false; };
  }, [orderId, auth.token]);

  if (state.orderId !== orderId) return <VinylLoader label="Loading invoice..." />;

  if (state.error) {
    const notFound = state.error.status === 404 || state.error.status === 403;
    return (
      <section className="page page-message" role="alert">
        <span className="mono-xs">{notFound ? "Not found" : "Something went wrong"}</span>
        <h2 className="form-title">{notFound ? "We couldn't find this invoice" : "Couldn't load the invoice"}</h2>
        <Link to="/" className="link">Back to home</Link>
      </section>
    );
  }

  const { invoice } = state;
  const customer = invoice.customer ?? {};

  return (
    <section className="page invoice-page">
      <div className="invoice-actions no-print">
        <p className="invoice-thanks" role="status">Payment approved. Thank you for your order!</p>
        <div className="invoice-buttons">
          <button className="btn" onClick={() => window.print()}>Print invoice</button>
          <Link to="/" className="btn btn-ghost">Continue shopping</Link>
        </div>
      </div>

      <article className="invoice card">
        <header className="invoice-head">
          <div>
            <span className="mono-xs">Invoice</span>
            <h1 className="invoice-title">#{invoice.order_id}</h1>
          </div>
          <dl className="invoice-meta">
            <div><dt className="mono-xs">Date</dt><dd>{formatDate(invoice.created_at)}</dd></div>
            <div><dt className="mono-xs">Paid with</dt><dd>Card ending in {invoice.card_last4}</dd></div>
          </dl>
        </header>

        <div className="invoice-parties">
          <div>
            <span className="mono-xs">Billed to</span>
            <p>{customer.name}<br />{customer.email}{customer.tax_id && <><br />Tax ID {customer.tax_id}</>}</p>
          </div>
          <div>
            <span className="mono-xs">Delivery address</span>
            <p>{invoice.delivery_address}</p>
          </div>
        </div>

        <table className="table invoice-items">
          <thead>
            <tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.product_id}>
                <td>{item.product_name}</td>
                <td>{item.quantity}</td>
                <td>{formatPrice(item.unit_price)}</td>
                <td>{formatPrice(Number(item.unit_price) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-total">
          <span className="mono-xs">Total</span>
          <strong>{formatPrice(invoice.total_price)}</strong>
        </div>
      </article>
    </section>
  );
}
