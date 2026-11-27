import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCategories } from "../api/catalog";
import { getProduct } from "../api/products";
import { useCart } from "../cart/useCart";
import QuantityStepper from "../components/QuantityStepper";
import RecordArt from "../components/RecordArt";
import VinylLoader from "../components/VinylLoader";
import { formatPrice } from "../utils/format";

// SHOP-100: Product detail page with all product properties.
// SHOP-101: Stock count, "Out of stock" label, Add to cart disabled when stock is 0.
// SHOP-115: Add to cart with a quantity; the cart can never hold more than the stock.
export default function ProductDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ id: null, product: null, category: "", error: null });

  useEffect(() => {
    let active = true;
    // /products/{id} returns category_id, not the name, so the name comes from /categories.
    // If categories fail the page still opens; only the category row is left out.
    Promise.all([getProduct(id), getCategories().catch(() => [])])
      .then(([product, categories]) => {
        if (!active) return;
        const category = categories.find((c) => c.id === product.category_id)?.name ?? "";
        setState({ id, product, category, error: null });
      })
      .catch((err) => {
        if (active) setState({ id, product: null, category: "", error: err });
      });
    return () => { active = false; };
  }, [id]);

  if (state.id !== id) return <VinylLoader label="Loading product…" />;

  if (state.error) {
    const notFound = state.error.status === 404;
    return (
      <section className="page page-message" role={notFound ? undefined : "alert"}>
        <span className="mono-xs">{notFound ? "Error 404" : "Something went wrong"}</span>
        <h2 className="form-title">{notFound ? "Product not found" : "Couldn't load this product"}</h2>
        <p>{notFound
          ? "It may have been removed, or the link may be wrong."
          : state.error.status === 0 ? state.error.message : "Please try again later."}</p>
        <Link to="/" className="link">Back to home</Link>
      </section>
    );
  }

  return <ProductDetail product={state.product} category={state.category} />;
}

function ProductDetail({ product, category }) {
  const navigate = useNavigate();
  const stock = Number(product.quantity_in_stock ?? 0);
  const inStock = stock > 0;

  // Opened from a shared link: there is no page to go back to, so go home.
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/"));

  const specs = [
    ["Category", category],
    ["Model", product.model],
    ["Serial number", product.serial_number],
    ["Warranty", product.warranty_status],
    ["Distributor", product.distributor],
  ].filter(([, value]) => value);

  return (
    <section className="page product-detail">
      <button type="button" className="link product-back" onClick={goBack}>← Back</button>

      <div className="product-detail-grid">
        <div className="card product-detail-art">
          <RecordArt seed={product.id} />
        </div>

        <div className="product-detail-info">
          {category && (
            <Link to={`/category/${encodeURIComponent(category)}`} className="mono-xs product-category-link">
              {category}
            </Link>
          )}
          <h1 className="product-detail-title">{product.name}</h1>

          <p className="product-detail-price">{formatPrice(product.price)}</p>

          <p id="stock-status" className={"mono-xs product-stock " + (inStock ? "text-ok" : "text-danger")}>
            {inStock ? `In stock: ${stock}` : "Out of stock"}
          </p>

          <AddToCart product={product} stock={stock} />

          <hr className="divider" />

          <h2 className="mono-xs product-section-label">Description</h2>
          <p className="product-description">{product.description}</p>

          <h2 className="mono-xs product-section-label">Details</h2>
          <dl className="spec-list">
            {specs.map(([label, value]) => (
              <div className="spec-row" key={label}>
                <dt className="mono-xs">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

// SHOP-115: How many can still be added = stock − what is already in the cart.
function AddToCart({ product, stock }) {
  const { addItem, quantityOf } = useCart();
  const inCart = quantityOf(product.id);
  const canAdd = Math.max(0, stock - inCart);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(0);
  const qty = Math.min(quantity, Math.max(canAdd, 1));

  const add = () => {
    addItem(product.id, qty, stock);
    setAdded(qty);
    setQuantity(1);
  };

  return (
    <div className="product-buy">
      {canAdd > 0 && (
        <QuantityStepper value={qty} max={canAdd} onChange={(n) => { setQuantity(n); setAdded(0); }} />
      )}
      <button
        type="button"
        className="btn btn-accent product-add"
        disabled={canAdd === 0}
        aria-describedby="stock-status cart-status"
        onClick={add}
      >
        Add to cart
      </button>
      <p id="cart-status" className="mono-xs product-cart-status" role="status">
        {added > 0 && <>Added {added} to your cart · </>}
        {stock > 0 && canAdd === 0 && <>All {stock} in stock are in your cart · </>}
        {inCart > 0 && <Link to="/cart" className="link-inline">View cart ({inCart})</Link>}
      </p>
    </div>
  );
}
