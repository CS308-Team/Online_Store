import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getCategories } from "../api/catalog";

export default function CategoryMenu() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  if (categories.length === 0) return null;

  return (
    <nav className="category-menu mono" aria-label="Categories">
      {categories.map((c) => (
        <NavLink key={c.id} to={`/category/${encodeURIComponent(c.name)}`} className="category-link">
          {c.name}
        </NavLink>
      ))}
    </nav>
  );
}
