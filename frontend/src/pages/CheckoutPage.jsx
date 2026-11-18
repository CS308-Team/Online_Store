import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";
import { placeOrder } from "../api/checkout";
import { listProducts } from "../api/products";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import FormField from "../components/FormField";
import OutOfStockAlert from "../components/OutOfStockAlert";
import VinylLoader from "../components/VinylLoader";
import { formatCardNumber, formatExpiry } from "../utils/card";
import { toOrderPayment, validateCheckout } from "../utils/checkout";
import { isOutOfStockError } from "../utils/errors";
import { formatPrice } from "../utils/format";
import "../styles/checkout.css";

// SHOP-119: Checkout page with the delivery address and the credit card form.
// Only logged-in customers reach it (SHOP-118). The card details are sent once
// with the order and are never stored in the browser.
const EMPTY = { deliveryAddress: "", cardHolder: "", cardNumber: "", expiry: "", cvv: "" };
const FIELD_ORDER = Object.keys(EMPTY);

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { items, count, clear } = useCart();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [catalog, setCatalog] = useState({ byId: null, error: null });
  const [reload, setReload] = useState(0);
  const latestRequest = useRef(0);

  // Prices and stock always come fresh from the API, like on the cart page
  useEffect(() => {
    const request = ++latestRequest.current;
    listProducts()
      .then((products) => {
        if (latestRequest.current === request) setCatalog({ byId: new Map(products.map((p) => [p.id, p])), error: null });
      })
      .catch((error) => {
        if (latestRequest.current === request) setCatalog((prev) => ({ ...prev, error }));
      });
  }, [reload]);

  // Start with the home address from the profile; the customer can change it
  useEffect(() => {
    let active = true;
    getMe(auth.token)
      .then((user) => {
        if (!active || !user?.home_address) return;
        setValues((prev) => (prev.deliveryAddress ? prev : { ...prev, deliveryAddress: user.home_address }));
      })
      .catch(() => { /* the address can still be typed in */ });
    return () => { active = false; };
  }, [auth.token]);

  const lines = useMemo(() => items.map((item) => {
    const product = catalog.byId?.get(item.product_id) ?? null;
    const stock = Number(product?.quantity_in_stock ?? 0);
    const available = Boolean(product) && stock >= item.quantity;
    const lineCents = product ? Math.round(Number(product.price) * 100) * item.quantity : 0;
    return { ...item, product, available, lineCents };
  }), [items, catalog.byId]);

  if (items.length === 0) {
    return (
      <section className="page">
        <div className="section-head"><h1 className="page-title">Checkout</h1></div>
        <div className="card empty-state">
          <span className="mono-xs">Cart is empty</span>
          <h3>There’s nothing to pay for yet.</h3>
          <Link to="/" className="btn btn-ghost">Browse products</Link>
        </div>
      </section>
    );
  }

  if (!catalog.byId && catalog.error) {
    return (
      <section className="page page-message error" role="alert">
        <p>{catalog.error.status === 0 ? catalog.error.message : "Couldn't load your order. Please try again."}</p>
        <button type="button" className="link" onClick={() => setReload((n) => n + 1)}>Try again</button>
      </section>
    );
  }
  if (!catalog.byId) return <VinylLoader label="Loading checkout…" />;

  const totalCents = lines.reduce((sum, l) => sum + l.lineCents, 0);
  const blocked = lines.some((l) => !l.available);

  const update = (field, format) => (e) => {
    const value = format ? format(e.target.value) : e.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || blocked) return;
    setSubmitError(null);

    const found = validateCheckout(values);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((f) => found[f]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder({
        items,
        deliveryAddress: values.deliveryAddress.trim(),
        payment: toOrderPayment(values),
      }, auth.token);
      clear();
      navigate(`/invoice/${order.order_id}`, { replace: true });
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err);
    }
  };

  const field = (id, format) => ({ id, value: values[id], onChange: update(id, format), error: errors[id] });

  return (
    <section className="page checkout-page">
      <div className="section-head">
        <h1 className="page-title">Checkout</h1>
        <Link to="/cart" className="link mono-xs">Back to cart</Link>
      </div>

      {isOutOfStockError(submitError) && <OutOfStockAlert error={submitError} />}

      <form className="checkout-layout" onSubmit={submit} noValidate>
        <div className="checkout-forms">
          <fieldset className="card checkout-section">
            <legend className="mono-xs">Delivery</legend>
            <FormField label="Delivery address" as="textarea" rows={3} autoComplete="street-address"
                       {...field("deliveryAddress")} />
          </fieldset>

          <fieldset className="card checkout-section">
            <legend className="mono-xs">Payment</legend>
            <FormField label="Name on card" autoComplete="cc-name" {...field("cardHolder")} />
            <FormField label="Card number" inputMode="numeric" autoComplete="cc-number"
                       placeholder="1234 5678 9012 3456" maxLength={19}
                       {...field("cardNumber", formatCardNumber)} />
            <div className="checkout-row">
              <FormField label="Expiry date" inputMode="numeric" autoComplete="cc-exp"
                         placeholder="MM/YY" maxLength={5} {...field("expiry", formatExpiry)} />
              <FormField label="Security code" inputMode="numeric" autoComplete="cc-csc"
                         placeholder="CVV" maxLength={3} {...field("cvv")} />
            </div>
            <p className="mono-xs checkout-note">We keep only the last 4 digits of your card.</p>
          </fieldset>
        </div>

        <aside className="card cart-summary checkout-summary" aria-label="Order summary">
          <h2 className="mono-xs">Your order</h2>
          <ul className="checkout-lines">
            {lines.map((line) => (
              <li key={line.product_id} className={line.available ? "" : "text-danger"}>
                <span>{line.product?.name ?? "Unavailable product"} × {line.quantity}</span>
                <span>{line.product ? formatPrice(line.lineCents / 100) : "—"}</span>
              </li>
            ))}
          </ul>
          <dl className="cart-summary-rows">
            <div><dt>Items</dt><dd>{count}</dd></div>
            <div className="cart-total"><dt>Total</dt><dd>{formatPrice(totalCents / 100)}</dd></div>
          </dl>

          {blocked && (
            <p className="mono-xs text-danger" id="checkout-blocked">
              Some items are no longer available in this quantity. <Link to="/cart" className="link">Update your cart</Link>
            </p>
          )}
          {submitError && !isOutOfStockError(submitError) && (
            <p className="form-alert" role="alert">
              {submitError.status === 0 ? submitError.message : "The payment could not be completed. Please try again."}
            </p>
          )}

          <button type="submit" className="btn btn-accent btn-block" disabled={submitting || blocked}
                  aria-describedby={blocked ? "checkout-blocked" : undefined}>
            {submitting ? "Processing payment…" : `Pay ${formatPrice(totalCents / 100)}`}
          </button>
        </aside>
      </form>
    </section>
  );
}
