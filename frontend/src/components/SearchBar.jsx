import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// SHOP-98: Search bar in the header. A search opens /search?q=..., so the
// results page can be shared and the back button works.
// initialQuery is the ?q= value in the address. Header renders this component with
// key={initialQuery}, so the box resets when the address changes (back button, other page).
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
      <label htmlFor="site-search" className="visually-hidden">Search products</label>
      <input
        ref={inputRef}
        id="site-search"
        type="search"
        className="input search-input"
        placeholder="Search albums, artists or products"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        maxLength={100}
      />
      <button type="submit" className="btn btn-sm search-button">Search</button>
    </form>
  );
}
