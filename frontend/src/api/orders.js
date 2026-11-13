import { apiRequest } from "./client";

// GET /deliveries (product manager only). One row per ordered product:
// { id, order_id, customer_id, product_id, product_name, quantity,
//   total_price, delivery_address, status, created_at }
export const getDeliveries = (token) => apiRequest("/deliveries", { token });

// GET /orders/{id}/invoice (only the customer who placed the order):
// { order_id, created_at, status, total_price, card_last4, delivery_address,
//   customer: { name, email, tax_id, home_address },
//   items: [{ product_id, product_name, quantity, unit_price }] }
export const getInvoice = (orderId, token) =>
  apiRequest(`/orders/${encodeURIComponent(orderId)}/invoice`, { token });
