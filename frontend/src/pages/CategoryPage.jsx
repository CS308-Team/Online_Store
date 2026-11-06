import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCategories, getProductsByCategory } from "../api/catalog";
import ProductCard from "../components/ProductCard";
import VinylLoader from "../components/VinylLoader";

export default function CategoryPage() {
  const { name } = useParams();
  // keep the category name with the result so an old response is never shown for a new category
  const [result, setResult] = useState({ name: null, exists: true, products: [], error: "" });

  useEffect(() => {
    let cancelled = false;
    // the backend returns an empty list for unknown names, so check the category list too
    Promise.all([getCategories(), getProductsByCategory(name)])
      .then(([categories, products]) => !cancelled && setResult({
        name, exists: categories.some((c) => c.name === name), products, error: "",
      }))
      .catch((err) => !cancelled && setResult({
        name, exists: true, products: [],
        error: err.status === 0 ? err.message : "Couldn't load products. Please try again.",
      }));
    return () => { cancelled = true; };
  }, [name]);

  if (result.name !== name) return <VinylLoader />;

  if (result.error) {
    return <section className="page page-message error" role="alert">{result.error}</section>;
  }

  if (!result.exists) {
    return (
      <section className="page page-message">
        <span className="mono-xs">Not found</span>
        <h2 className="form-title">There is no category called “{name}”</h2>
        <Link to="/" className="link">Back to home</Link>
      </section>
    );
  }

  const count = result.products.length;
  return (
    <section className="page">
      <div className="section-head">
        <h1 className="page-title">{name}</h1>
        <span className="mono-xs" role="status">{count} {count === 1 ? "product" : "products"}</span>
      </div>

      {count === 0 ? (
        <p className="page-message">No products in this category yet.</p>
      ) : (
        <div className="product-grid">
          {result.products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
