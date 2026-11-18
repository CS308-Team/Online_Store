import { Link } from "react-router-dom";

// SHOP-118: Only logged-in customers reach this page; guests are sent to the
// login page first and come back here after logging in (see App.jsx).
export default function CheckoutPage() {
  return (
    <section className="page">
      <div className="section-head"><h1 className="page-title">Checkout</h1></div>
      <Link to="/cart" className="link">Back to cart</Link>
    </section>
  );
}
