import { describe, it, expect, afterEach } from "vitest";
import { CART_STORAGE_KEY, addToItems, countItems, readCart, setInItems, writeCart } from "../cart/cartStorage";

afterEach(() => localStorage.clear());

const save = (value) => localStorage.setItem(CART_STORAGE_KEY, typeof value === "string" ? value : JSON.stringify(value));

describe("readCart / writeCart (SHOP-114)", () => {
  it("starts empty when nothing is saved", () => {
    expect(readCart()).toEqual([]);
  });

  it("keeps the cart in the backend's { product_id, quantity } shape", () => {
    writeCart([{ product_id: 3, quantity: 2 }]);
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY))).toEqual([{ product_id: 3, quantity: 2 }]);
    expect(readCart()).toEqual([{ product_id: 3, quantity: 2 }]);
  });

  it("removes the key when the cart becomes empty", () => {
    writeCart([{ product_id: 3, quantity: 2 }]);
    writeCart([]);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it("ignores broken or hand-edited data", () => {
    save("not json");
    expect(readCart()).toEqual([]);
    save({ product_id: 1, quantity: 1 });
    expect(readCart()).toEqual([]);
    save([
      { product_id: 1, quantity: 2, name: "extra fields are dropped" },
      { product_id: 1, quantity: 5 },       // duplicate id
      { product_id: "2", quantity: 1 },     // id is not a number
      { product_id: 3, quantity: 0 },       // nothing to buy
      { product_id: 4, quantity: 1.5 },     // half a record
      null,
    ]);
    expect(readCart()).toEqual([{ product_id: 1, quantity: 2 }]);
  });
});

describe("cart helpers", () => {
  const items = [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }];

  it("adds a new product at the end", () => {
    expect(addToItems(items, 5, 1, 10)).toEqual([...items, { product_id: 5, quantity: 1 }]);
  });

  it("adds to the quantity of a product already in the cart", () => {
    expect(addToItems(items, 1, 3, 10)[0]).toEqual({ product_id: 1, quantity: 5 });
  });

  it("never goes above the stock (SHOP-115)", () => {
    expect(addToItems(items, 1, 5, 4)[0].quantity).toBe(4);
    expect(addToItems(items, 1, 1, 2)).toBe(items); // already at the stock: nothing changes
    expect(addToItems([], 9, 1, 0)).toEqual([]);   // out of stock: not added
  });

  it("sets a quantity and removes the product at 0", () => {
    expect(setInItems(items, 2, 4)[1]).toEqual({ product_id: 2, quantity: 4 });
    expect(setInItems(items, 2, 0)).toEqual([{ product_id: 1, quantity: 2 }]);
  });

  it("counts every unit, not just the lines", () => {
    expect(countItems(items)).toBe(3);
    expect(countItems([])).toBe(0);
  });
});
