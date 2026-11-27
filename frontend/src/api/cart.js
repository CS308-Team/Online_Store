import { apiRequest } from "./client";

// SHOP-117: POST /cart/merge (backend SHOP-213), sent right after a customer logs in.
// Request: { items: [{ product_id, quantity }] }, the cart built while logged out.
// Response: { cart: [{ product_id, quantity, ... }], adjusted: [...] }, the account's
// cart after the merge. A plain list or { items: [...] } is accepted as well.
// The backend adds quantities of the same product together and keeps them
// within the stock (SHOP-214).
//
// Returns the merged items, or null when the backend has no merge endpoint yet
// (404, 405 or 501) or answers in a shape the cart does not know. In that case
// the cart simply stays on this device instead of being emptied.
export async function mergeGuestCart(items, token) {
  try {
    const data = await apiRequest("/cart/merge", { method: "POST", body: { items }, token });
    return normalizeCart(data);
  } catch (err) {
    if ([404, 405, 501].includes(err.status)) return null;
    throw err;
  }
}

// Keeps only well-formed rows so a surprising response cannot break the cart.
// Returns null when the response holds no cart list at all.
export function normalizeCart(data) {
  const rows = Array.isArray(data) ? data
    : Array.isArray(data?.cart) ? data.cart
    : Array.isArray(data?.items) ? data.items
    : null;
  if (rows === null) return null;
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    const productId = Number(row?.product_id);
    const quantity = Number(row?.quantity);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    if (!Number.isInteger(quantity) || quantity <= 0) continue;
    if (seen.has(productId)) continue;
    seen.add(productId);
    items.push({ product_id: productId, quantity });
  }
  return items;
}
