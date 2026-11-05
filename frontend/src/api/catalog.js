import { apiRequest } from "./client";

export const getCategories = () => apiRequest("/categories");

export const getProductsByCategory = (name) =>
  apiRequest(`/products?category_name=${encodeURIComponent(name)}`);
