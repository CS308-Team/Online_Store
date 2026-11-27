import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listProducts } from "../api/products";
import { readCart } from "../cart/cartStorage";
import { useCart } from "../cart/useCart";
import QuantityStepper from "../components/QuantityStepper";
import RecordArt from "../components/RecordArt";
import VinylLoader from "../components/VinylLoader";
import { formatPrice } from "../utils/format";

// SHOP-113: Cart page. SHOP-112: guests can change and remove products without logging in.
// SHOP-115: quantities are limited by the current stock.
// The cart only stores ids and quantities; names, prices and stock come from the API
// so the page always shows today's price and stock.
export default function CartPage() {
  const { items, count, setQuantity, removeItem } = useCart();
  const ids = items.map((i) => i.product_id).sort((a, b) => a - b).join(",");
  const [catalog, setCatalog] = useState({ byId: null, error: null });
  const [reload, setReload] = useState(0);
  const [lowered, setLowered] = useState({}); // product_id → quantity before it was lowered to the stock

  const latestRequest = useRef(0);

  useEffect(() => {
    if (!ids) return;
    const request = ++latestRequest.current;
    listProducts()
      .then((products) => {
        if (latestRequest.current !== request) return;
        const byId = new Map(products.map((p) => [p.id, p]));
        // More in the cart than in stock now (someone else bought it): lower it and say so.
        const changed = {};
        for (const item of readCart()) {
          const stock = Number(byId.get(item.product_id)?.quantity_in_stock ?? 0);
          if (stock > 0 && item.quantity > stock) {
            changed[item.product_id] = item.quantity;
            setQuantity(item.product_id, stock);
          }
        }
        if (Object.keys(changed).length) setLowered((prev) => ({ ...prev, ...changed }));
        setCatalog({ byId, error: null });
      })
      .catch((error) => {
        if (latestRequest.current === request) setCatalog((prev) => ({ ...prev, error }));
      });
  }, [ids, reload, setQuantity]);

  const lines = useMemo(() => items.map((item) => {
    const product = catalog.byId?.get(item.product_id) ?? null;
    const stock = Number(product?.quantity_in_stock ?? 0);
    const available = Boolean(product) && stock > 0;
    // cents avoid 0.1 + 0.2 style rounding errors in the total
    const lineCents = available ? Math.round(Number(product.price) * 100) * item.quantity : 0;
    return { ...item, product, stock, available, lineCents };
  }), [items, catalog.byId]);

  if (items.length === 0) {
    return (
      <section className="page">
        <div className="section-head"><h1 className="page-title">Your cart</h1></div>
        <div className="card empty-state">
          <span className="mono-xs">Cart is empty</span>
          <h3>There’s nothing in your cart yet.</h3>
          <p className="muted">Find a record or a turntable you like and add it here.</p>
          <Link to="/" className="btn btn-ghost">Browse products</Link>
        </div>
      </section>
    );
  }

  if (!catalog.byId && catalog.error) {
    return (
      <section className="page page-message error" role="alert">
        <p>{catalog.error.status === 0 ? catalog.error.message : "Couldn't load your cart. Please try again."}</p>
        <button type="button" className="link" onClick={() => setReload((n) => n + 1)}>Try again</button>
      </section>
    );
  }
  if (!catalog.byId) return <VinylLoader label="Loading your cart…" />;

  const totalCents = lines.reduce((sum, l) => sum + l.lineCents, 0);
  const blocked = lines.some((l) => !l.available);

  return (
    <section className="page cart-page">
      <div className="section-head">
        <h1 className="page-title">Your cart</h1>
        <span className="mono-xs" role="status">{count} {count === 1 ? "item" : "items"}</span>
      </div>

      <div className="cart-layout">
        <ul className="cart-lines">
          {lines.map((line) => (
            <CartLine
              key={line.product_id}
              line={line}
              loweredFrom={lowered[line.product_id]}
              onQuantity={(q) => {
                setLowered((prev) => ({ ...prev, [line.product_id]: undefined }));
                setQuantity(line.product_id, q);
              }}
              onRemove={() => removeItem(line.product_id)}
            />
          ))}
        </ul>

        <aside className="card cart-summary" aria-label="Order summary">
          <h2 className="mono-xs">Summary</h2>
          <dl className="cart-summary-rows">
            <div><dt>Items</dt><dd>{count}</dd></div>
            <div className="cart-total"><dt>Total</dt><dd>{formatPrice(totalCents / 100)}</dd></div>
          </dl>
          {blocked && (
            <p className="mono-xs text-danger" id="cart-blocked">
              Remove the unavailable items to continue.
            </p>
          )}
          {/* /checkout: guest → login redirect (SHOP-118) and the checkout form (SHOP-119) */}
          {blocked ? (
            <button type="button" className="btn btn-accent btn-block" disabled aria-describedby="cart-blocked">
              Go to checkout
            </button>
          ) : (
            <Link to="/checkout" className="btn btn-accent btn-block">Go to checkout</Link>
          )}
          <Link to="/" className="link cart-continue">Continue shopping</Link>
        </aside>
      </div>
    </section>
  );
}

function CartLine({ line, loweredFrom, onQuantity, onRemove }) {
  const { product, stock, available } = line;
  const name = product?.name ?? "Unavailable product";

  return (
    <li className={"card cart-line" + (available ? "" : " is-unavailable")}>
      <Link to={`/products/${line.product_id}`} className="cart-line-art" tabIndex={-1} aria-hidden="true">
        <RecordArt seed={line.product_id} />
      </Link>

      <div className="cart-line-info">
        {product?.category && <span className="mono-xs">{product.category}</span>}
        {product
          ? <Link to={`/products/${line.product_id}`} className="cart-line-name">{name}</Link>
          : <span className="cart-line-name">{name}</span>}
        {product && <span className="muted cart-line-unit">{formatPrice(product.price)} each</span>}

        {!product && <p className="mono-xs text-danger cart-line-note">This product is no longer sold.</p>}
        {product && stock === 0 && <p className="mono-xs text-danger cart-line-note">Out of stock</p>}
        {available && loweredFrom > stock && (
          <p className="mono-xs text-danger cart-line-note" role="status">
            Only {stock} left, so we changed your quantity from {loweredFrom} to {stock}.
          </p>
        )}
      </div>

      <div className="cart-line-qty">
        {available && (
          <QuantityStepper value={line.quantity} max={stock} onChange={onQuantity} label={`Quantity of ${name}`} />
        )}
      </div>

      <div className="cart-line-end">
        <span className="cart-line-total">{available ? formatPrice(line.lineCents / 100) : "—"}</span>
        <button type="button" className="link cart-line-remove" onClick={onRemove} aria-label={`Remove ${name}`}>
          Remove
        </button>
      </div>
    </li>
  );
}
