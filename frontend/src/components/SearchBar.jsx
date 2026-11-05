import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// SHOP-98: Header'daki arama çubuğu. Arama /search?q=... adresine gider;
// böylece sonuç sayfası paylaşılabilir ve geri tuşu çalışır.
// initialQuery adresteki ?q= değeridir. Header bu bileşeni key={initialQuery}
// ile çizer; adres değişince (geri tuşu, başka sayfa) kutu kendiliğinden yenilenir.
export default function SearchBar({ initialQuery = "" }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) { inputRef.current?.focus(); return; }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form className="search-bar" role="search" onSubmit={submit}>
      <label htmlFor="site-search" className="visually-hidden">Ürün ara</label>
      <input
        ref={inputRef}
        id="site-search"
        type="search"
        className="input search-input"
        placeholder="Albüm, sanatçı ya da ürün ara"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        maxLength={100}
      />
      <button type="submit" className="btn btn-sm search-button">Ara</button>
    </form>
  );
}
