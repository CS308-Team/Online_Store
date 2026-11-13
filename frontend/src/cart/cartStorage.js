// SHOP-114: The guest cart is saved in localStorage so it survives a refresh,
// closing the tab and logging in.
//
// Format: [{ product_id, quantity }] — the same shape as the backend's
// cart_items table and the items of POST /orders, so the cart can be sent to
// the backend after login (SHOP-117) without converting it.
// Only ids and quantities are stored. Names, prices and stock are always read
// fresh from the API, so the cart never shows an old price.
export const CART_STORAGE_KEY = "kozalak.cart";

const isValidItem = (item) =>
  Number.isInteger(item?.product_id) && item.product_id > 0 &&
  Number.isInteger(item?.quantity) && item.quantity > 0;

// Bad or hand-edited data is dropped instead of breaking the page.
export function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    const seen = new Set();
    return saved.filter((item) => {
      if (!isValidItem(item) || seen.has(item.product_id)) return false;
      seen.add(item.product_id);
      return true;
    }).map(({ product_id, quantity }) => ({ product_id, quantity }));
  } catch {
    return [];
  }
}

export function writeCart(items) {
  try {
    if (items.length) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    else localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    /* storage blocked (private mode): the cart still works until the tab closes */
  }
}

// ---- Pure helpers (used by CartProvider and easy to unit test) ----

// Adds quantity to a product, never going above maxQuantity (the stock).
export function addToItems(items, productId, quantity, maxQuantity) {
  const current = items.find((i) => i.product_id === productId)?.quantity ?? 0;
  const next = Math.min(current + quantity, maxQuantity);
  if (next <= current) return items;
  return setInItems(items, productId, next);
}

// Sets the quantity of a product; 0 or less removes it. New products go last.
export function setInItems(items, productId, quantity) {
  if (quantity <= 0) return items.filter((i) => i.product_id !== productId);
  if (items.some((i) => i.product_id === productId)) {
    return items.map((i) => (i.product_id === productId ? { ...i, quantity } : i));
  }
  return [...items, { product_id: productId, quantity }];
}

export const countItems = (items) => items.reduce((sum, i) => sum + i.quantity, 0);
