import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders } from "../api/orders";
import { useAuth } from "../auth/useAuth";
import OrderStatusBadge from "../components/OrderStatusBadge";
import VinylLoader from "../components/VinylLoader";
import { formatPrice } from "../utils/format";
import { statusInfo } from "../utils/orderStatus";

// SHOP-125 (story SHOP-90): The customer sees their past orders and the status of each one.
// Newest first. Each order links to its invoice.
const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

// Accepts the backend's list as [...] or { orders: [...] }; drops rows without an id.
function normalizeOrders(data) {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
  return rows
    .map((o) => ({ ...o, order_id: o?.order_id ?? o?.id, items: Array.isArray(o?.items) ? o.items : [] }))
    .filter((o) => o.order_id != null)
    .sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || b.order_id - a.order_id);
}

export default function OrderHistoryPage() {
  const { auth, logout } = useAuth();
  const [state, setState] = useState({ token: null, orders: null, error: null });
  const [reload, setReload] = useState(0);
  const latestRequest = useRef(0);

  useEffect(() => {
    const request = ++latestRequest.current;
    getMyOrders(auth.token)
      .then((data) => latestRequest.current === request && setState({ token: auth.token, orders: normalizeOrders(data), error: null }))
      .catch((error) => {
        if (latestRequest.current !== request) return;
        // token refused: log out; the route guard sends the user to the login page
        if (error.status === 401) logout();
        else setState({ token: auth.token, orders: null, error });
      });
  }, [auth.token, reload, logout]);

  if (state.token !== auth.token) return <VinylLoader label="Loading your orders…" />;

  if (state.error) {
    return (
      <section className="page page-message error" role="alert">
        <p>{state.error.status === 0 ? state.error.message : "Couldn't load your orders. Please try again."}</p>
        <button type="button" className="link" onClick={() => setReload((n) => n + 1)}>Try again</button>
      </section>
    );
  }

  const { orders } = state;
  return (
    <section className="page orders-page">
      <div className="section-head">
        <h1 className="page-title">Your orders</h1>
        <span className="mono-xs" role="status">{orders.length} {orders.length === 1 ? "order" : "orders"}</span>
      </div>

      {orders.length === 0 ? (
        <div className="card empty-state">
          <span className="mono-xs">No orders yet</span>
          <h3>You haven’t ordered anything yet.</h3>
          <p className="muted">When you place an order, you can follow its delivery here.</p>
          <Link to="/" className="btn btn-ghost">Browse products</Link>
        </div>
      ) : (
        <ol className="order-list">
          {orders.map((order) => <OrderCard key={order.order_id} order={order} />)}
        </ol>
      )}
    </section>
  );
}

const STEPS = ["Processing", "In transit", "Delivered"];

function OrderCard({ order }) {
  const { step } = statusInfo(order.status);
  const date = formatDate(order.created_at);
  return (
    <li className="card order-card">
      <header className="order-card-head">
        <div>
          <h2 className="order-card-title">Order #{order.order_id}</h2>
          {date && <span className="mono-xs">Ordered {date}</span>}
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      {step > 0 && (
        <ol className="order-steps" aria-label="Delivery progress">
          {STEPS.map((label, i) => (
            <li key={label} className={i < step ? "is-done" : ""} aria-current={i === step - 1 ? "step" : undefined}>
              <span className="mono-xs">{label}</span>
            </li>
          ))}
        </ol>
      )}

      {order.items.length > 0 && (
        <ul className="order-items">
          {order.items.map((item) => (
            <li key={item.product_id}>
              <Link to={`/products/${item.product_id}`} className="order-item-name">
                {item.product_name ?? `Product #${item.product_id}`}
              </Link>
              <span className="muted"> × {item.quantity}</span>
              {item.unit_price != null && (
                <span className="order-item-price">{formatPrice(Number(item.unit_price) * item.quantity)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="order-card-foot">
        <span className="order-total">
          <span className="mono-xs">Total</span> {formatPrice(order.total_price)}
        </span>
        <Link to={`/invoice/${order.order_id}`} className="link">View invoice</Link>
      </footer>
    </li>
  );
}
