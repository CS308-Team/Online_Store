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
          error: err.status === 0 ? err.message : "Arama sırasında bir sorun oluştu. Biraz sonra tekrar dene.",
        });
      });
  }, [query]);

  if (!query) {
    return (
      <section className="page page-message">
        <span className="mono-xs">Arama</span>
        <h2 className="form-title">Ne arıyorsun?</h2>
        <p>Yukarıdaki kutuya bir albüm, sanatçı ya da ürün adı yaz.</p>
      </section>
    );
  }

  if (result.query !== query) return <VinylLoader label="Aranıyor…" />;

  if (result.error) {
    return <section className="page page-message error" role="alert">{result.error}</section>;
  }

  const count = result.products.length;
  return (
    <section className="page">
      <div className="section-head">
        <h2>“{query}” için sonuçlar</h2>
        <span className="mono-xs" role="status">{count} ürün</span>
      </div>

      {count === 0 ? (
        <div className="card empty-state">
          <span className="mono-xs">Sonuç yok</span>
          <h3>“{query}” ile eşleşen bir ürün bulamadık.</h3>
          <ul className="muted empty-tips">
            <li>Yazımı kontrol et ya da daha kısa bir kelime dene.</li>
            <li>Sanatçı yerine albüm adıyla, ürün yerine marka adıyla ara.</li>
          </ul>
          <Link to="/" className="btn btn-ghost">Ana sayfaya dön</Link>
        </div>
      ) : (
        <div className="product-grid">
          {result.products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
