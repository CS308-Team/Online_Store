import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProducts } from "../api/products";
import ProductCard from "../components/ProductCard";
import VinylLoader from "../components/VinylLoader";

// SHOP-99: Arama sonuçları sayfası ve "sonuç yok" mesajı.
export default function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  // Sonuç hangi aramaya aitse onunla birlikte saklanır; adres değişince
  // eski sonuç gösterilmez, yeni cevap gelene kadar yükleyici görünür.
  const [result, setResult] = useState({ query: null, products: [], error: "" });
  const latestQuery = useRef(query);

  useEffect(() => {
    latestQuery.current = query;
    if (!query) return;
    searchProducts(query)
      .then((products) => {
        if (latestQuery.current === query) setResult({ query, products, error: "" });
      })
      .catch((err) => {
        if (latestQuery.current === query) setResult({
          query, products: [],
          error: err.status === 0 ? err.message : "Something went wrong while searching. Please try again later.",
        });
      });
  }, [query]);

  if (!query) {
    return (
      <section className="page page-message">
        <span className="mono-xs">Search</span>
        <h2 className="form-title">What are you looking for?</h2>
        <p>Type an album, artist or product name in the box above.</p>
      </section>
    );
  }

  if (result.query !== query) return <VinylLoader label="Searching…" />;

  if (result.error) {
    return <section className="page page-message error" role="alert">{result.error}</section>;
  }

  const count = result.products.length;
  return (
    <section className="page">
      <div className="section-head">
        <h2>Results for “{query}”</h2>
        <span className="mono-xs" role="status">{count} {count === 1 ? "product" : "products"}</span>
      </div>

      {count === 0 ? (
        <div className="card empty-state">
          <span className="mono-xs">No results</span>
          <h3>We couldn’t find any products matching “{query}”.</h3>
          <ul className="muted empty-tips">
            <li>Check the spelling or try a shorter word.</li>
            <li>Search by album name instead of artist, or by brand instead of product.</li>
          </ul>
          <Link to="/" className="btn btn-ghost">Back to home</Link>
        </div>
      ) : (
        <div className="product-grid">
          {result.products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
