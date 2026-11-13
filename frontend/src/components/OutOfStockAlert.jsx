import { Link } from "react-router-dom";
import { isOutOfStockError } from "../utils/errors";

export default function OutOfStockAlert({ error }) {
  if (!isOutOfStockError(error)) return null;

  // the backend may later send the affected products: [{ name, available }]
  const items = Array.isArray(error.detail?.items) ? error.detail.items : [];

  return (
    <div className="stock-alert" role="alert">
      <span className="mono-xs">Out of stock</span>
      <p className="stock-alert-title">Some items in your cart are no longer available.</p>
      {items.length > 0 ? (
        <ul className="stock-alert-list">
          {items.map((item) => (
            <li key={item.name}>
              {item.name}: {item.available > 0 ? `only ${item.available} left` : "sold out"}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Please update the quantities in your cart and try again. You have not been charged.</p>
      )}
      <Link to="/cart" className="btn btn-sm">Back to cart</Link>
    </div>
  );
}
