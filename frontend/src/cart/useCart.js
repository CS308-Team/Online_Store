import { useContext } from "react";
import { CartContext } from "./context";

// { items, count, quantityOf(id), addItem(id, qty, stock), setQuantity(id, qty), removeItem(id), clear(),
//   replaceItems(items) }
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
