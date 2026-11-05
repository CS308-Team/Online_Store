import { apiRequest } from "./client";

export const getCategories = () => apiRequest("/categories");
