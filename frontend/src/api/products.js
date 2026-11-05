import { apiRequest } from "./client";

// GET /products?category_name=...&search=...&sort=...
// Empty parameters are not sent. sort: "price_asc" | "price_desc" | "popularity"
// (SHOP-97, backend SHOP-75). The backend answers 400 to any other sort value.
export function listProducts({ categoryName, search, sort } = {}) {
  const params = new URLSearchParams();
  if (categoryName) params.set("category_name", categoryName);
  if (search) params.set("search", search);
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  return apiRequest(`/products${qs ? `?${qs}` : ""}`);
}

// GET /products?search=...&sort=... (backend: SHOP-76). If the backend ignores
// the search parameter it returns every product, so results are also filtered
// here by name and description. Filtering keeps the backend's sort order.
export async function searchProducts(query, sort) {
  const q = query.trim();
  const products = await listProducts({ search: q, sort });
  const needle = q.toLowerCase();
  return products.filter((p) =>
    `${p.name} ${p.description ?? ""}`.toLowerCase().includes(needle)
  );
}

// GET /products/{id} → product · 404 not found (SHOP-100)
export function getProduct(id) {
  return apiRequest(`/products/${encodeURIComponent(id)}`);
}
