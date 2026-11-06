import { apiRequest } from "./client";

export const getCategories = () => apiRequest("/categories");

// sort (SHOP-97): "price_asc" | "price_desc" | "popularity", or empty for the default order
export const getProductsByCategory = (name, sort) =>
  apiRequest(`/products?category_name=${encodeURIComponent(name)}${sort ? `&sort=${sort}` : ""}`);
