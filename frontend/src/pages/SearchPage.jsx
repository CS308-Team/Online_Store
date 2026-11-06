import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProducts } from "../api/products";
import ProductCard from "../components/ProductCard";
import SortSelect from "../components/SortSelect";
import VinylLoader from "../components/VinylLoader";
import { useSortParam } from "../utils/useSortParam";

// SHOP-99: Search results page with a "no results" message.
// SHOP-96/97: Results can be sorted by price or popularity (?sort=).
export default function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const [sort, setSort] = useSortParam();
  const requestKey = `${query}\n${sort}`;

  // The result is stored with the search + sort it belongs to.
  // New search: the loader shows until the answer arrives.
  // Same search, new sort: the old list stays (faded) until the new order arrives.
  const [result, setResult] = useState({ key: null, query: null, products: [], error: "" });
  const latestKey = useRef(requestKey);

  useEffect(() => {
    latestKey.current = requestKey;
    if (!query) return;
    searchProducts(query, sort)
      .then((products) => {
        if (latestKey.current === requestKey) setResult({ key: requestKey, query, products, error: "" });
      })
      .catch((err) => {
        if (latestKey.current === requestKey) setResult({
          key: requestKey, query, products: [],
          error: err.status === 0 ? err.message : "Something went wrong while searching. Please try again later.",
        });
      });
  }, [query, sort, requestKey]);

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
  const resorting = result.key !== requestKey;
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
        <>
          <div className="list-toolbar">
            <SortSelect value={sort} onChange={setSort} />
          </div>
          <div className={"product-grid" + (resorting ? " is-stale" : "")} aria-busy={resorting}>
            {result.products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </section>
  );
}
