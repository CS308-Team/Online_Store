import { apiRequest } from "./client";

// GET /deliveries (product manager only). One row per ordered product:
// { id, order_id, customer_id, product_id, product_name, quantity,
//   total_price, delivery_address, status, created_at }
export const getDeliveries = (token) => apiRequest("/deliveries", { token });

// GET /orders/{id}/invoice (only the customer who placed the order):
// { order_id, created_at, status, total_price, card_last4, delivery_address,
//   customer: { name, email, tax_id, home_address },
//   items: [{ product_id, product_name, quantity, unit_price }],
//   email_sent }   ← SHOP-124: true / false once the PDF e-mail exists (SHOP-153, SHOP-155)
export const getInvoice = (orderId, token) =>
  apiRequest(`/orders/${encodeURIComponent(orderId)}/invoice`, { token });

// SHOP-125: GET /orders (backend SHOP-90 / SHOP-157, only the logged-in customer's own orders):
// [{ order_id, created_at, status, total_price,
//    items: [{ product_id, product_name, quantity, unit_price }] }]
// status (SHOP-156): "processing" | "in-transit" | "delivered".
// Same field names as the invoice above, so one order shape serves both pages.
export const getMyOrders = (token) => apiRequest("/orders", { token });
