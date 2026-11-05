import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProductsByCategory } from "../api/catalog";
import ProductCard from "../components/ProductCard";
import VinylLoader from "../components/VinylLoader";

export default function CategoryPage() {
  const { name } = useParams();
  // keep the category name with the result so an old response is never shown for a new category
  const [result, setResult] = useState({ name: null, products: [], error: "" });

  useEffect(() => {
    let cancelled = false;
    getProductsByCategory(name)
      .then((products) => !cancelled && setResult({ name, products, error: "" }))
      .catch((err) => !cancelled && setResult({
        name, products: [],
        error: err.status === 0 ? err.message : "Couldn't load products. Please try again.",
      }));
    return () => { cancelled = true; };
  }, [name]);

  if (result.name !== name) return <VinylLoader />;

  if (result.error) {
    return <section className="page page-message error" role="alert">{result.error}</section>;
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
