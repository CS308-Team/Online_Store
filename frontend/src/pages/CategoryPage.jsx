import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCategories, getProductsByCategory } from "../api/catalog";
import ProductCard from "../components/ProductCard";
import SortSelect from "../components/SortSelect";
import VinylLoader from "../components/VinylLoader";
import { useSortParam } from "../utils/useSortParam";

export default function CategoryPage() {
  const { name } = useParams();
  const [sort, setSort] = useSortParam(); // SHOP-96
  // keep the category name with the result so an old response is never shown for a new category
  // (sort is kept too: a new sort keeps the old list on screen, faded, until the new order arrives)
  const [result, setResult] = useState({ name: null, sort: "", exists: true, products: [], error: "" });

  useEffect(() => {
    let cancelled = false;
    // the backend returns an empty list for unknown names, so check the category list too
    Promise.all([getCategories(), getProductsByCategory(name, sort)])
      .then(([categories, products]) => !cancelled && setResult({
        name, sort, exists: categories.some((c) => c.name === name), products, error: "",
      }))
      .catch((err) => !cancelled && setResult({
        name, sort, exists: true, products: [],
        error: err.status === 0 ? err.message : "Couldn't load products. Please try again.",
      }));
    return () => { cancelled = true; };
  }, [name, sort]);

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
  const resorting = result.sort !== sort;
  return (
    <section className="page">
      <div className="section-head">
        <h1 className="page-title">{name}</h1>
        <span className="mono-xs" role="status">{count} {count === 1 ? "product" : "products"}</span>
      </div>

      {count === 0 ? (
        <p className="page-message">No products in this category yet.</p>
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
