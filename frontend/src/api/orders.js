import { apiRequest } from "./client";

// GET /deliveries (product manager only). One row per ordered product:
// { id, order_id, customer_id, product_id, product_name, quantity,
//   total_price, delivery_address, status, created_at }
export const getDeliveries = (token) => apiRequest("/deliveries", { token });
