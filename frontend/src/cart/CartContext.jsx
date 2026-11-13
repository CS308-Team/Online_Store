import { useCallback, useEffect, useMemo, useState } from "react";
import { CartContext } from "./context";
import { CART_STORAGE_KEY, addToItems, countItems, readCart, setInItems, writeCart } from "./cartStorage";

// SHOP-112 / SHOP-114: The cart works without logging in. Every change is
// saved to localStorage right away; other tabs pick the change up too.
export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  const update = useCallback((change) => setItems(change), []);

  // Save after every change (also cleans up bad data found on first load)
  useEffect(() => { writeCart(items); }, [items]);

  // maxQuantity: the product's stock (SHOP-115). The cart never holds more.
  const addItem = useCallback((productId, quantity, maxQuantity) =>
    update((prev) => addToItems(prev, productId, quantity, maxQuantity)), [update]);
  const setQuantity = useCallback((productId, quantity) =>
    update((prev) => setInItems(prev, productId, quantity)), [update]);
  const removeItem = useCallback((productId) =>
    update((prev) => setInItems(prev, productId, 0)), [update]);
  const clear = useCallback(() => update(() => []), [update]);

  // Cart changed in another tab
  useEffect(() => {
    const onStorage = (e) => { if (e.key === CART_STORAGE_KEY || e.key === null) setItems(readCart()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({
    items,
    count: countItems(items),
    quantityOf: (productId) => items.find((i) => i.product_id === productId)?.quantity ?? 0,
    addItem, setQuantity, removeItem, clear,
  }), [items, addItem, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
