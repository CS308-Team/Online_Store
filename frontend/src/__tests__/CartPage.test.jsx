import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../auth/context";
import { CartProvider } from "../cart/CartContext";
import { CART_STORAGE_KEY } from "../cart/cartStorage";
import CartPage from "../pages/CartPage";
import Header from "../components/Header";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

const catalog = [
  { id: 1, name: "Classic Turntable", price: 249.99, quantity_in_stock: 5, category: "Turntables" },
  { id: 2, name: "Kind of Blue", price: "34.99", quantity_in_stock: 2, category: "Vinyl Records" },
  { id: 3, name: "Retro Speaker", price: 120, quantity_in_stock: 0, category: "Speakers" },
];

function mockApi(products = catalog) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const body = String(url).endsWith("/categories") ? [] : products;
    return { ok: true, status: 200, json: async () => body };
  });
}

const saveCart = (items) => localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
const savedCart = () => JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");

const renderCart = ({ auth = null } = {}) => render(
  <AuthContext.Provider value={{ auth, isLoggedIn: Boolean(auth), logout: () => {} }}>
    <CartProvider>
      <MemoryRouter initialEntries={["/cart"]}>
        <Header />
        <Routes><Route path="/cart" element={<CartPage />} /></Routes>
      </MemoryRouter>
    </CartProvider>
  </AuthContext.Provider>
);

const lineFor = (name) => screen.getByRole("link", { name }).closest("li");

describe("CartPage (SHOP-113)", () => {
  it("shows an empty state without calling the API", () => {
    const spy = mockApi();
    renderCart();
    expect(screen.getByText("There’s nothing in your cart yet.")).toBeTruthy();
    expect(spy.mock.calls.filter(([u]) => String(u).includes("/products"))).toHaveLength(0);
  });

  it("lists products with today's price, line totals and the total", async () => {
    mockApi();
    saveCart([{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]);
    renderCart();
    await screen.findByRole("link", { name: "Classic Turntable" });
    expect(within(lineFor("Classic Turntable")).getByText("₺499.98")).toBeTruthy();
    expect(within(lineFor("Kind of Blue")).getByText("₺34.99")).toBeTruthy();
    expect(screen.getByText("₺534.97")).toBeTruthy(); // total, no float rounding errors
    expect(screen.getByRole("link", { name: "Go to checkout" }).getAttribute("href")).toBe("/checkout");
  });

  it("changes a quantity and saves it (SHOP-112)", async () => {
    mockApi();
    saveCart([{ product_id: 1, quantity: 1 }]);
    renderCart();
    await screen.findByRole("link", { name: "Classic Turntable" });
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity of classic turntable" }));
    expect(savedCart()).toEqual([{ product_id: 1, quantity: 2 }]);
    expect(screen.getAllByText("₺499.98").length).toBeGreaterThan(0);
  });

  it("does not let the quantity go above the stock (SHOP-115)", async () => {
    mockApi();
    saveCart([{ product_id: 2, quantity: 2 }]); // stock is 2
    renderCart();
    await screen.findByRole("link", { name: "Kind of Blue" });
    expect(screen.getByRole("button", { name: "Increase quantity of kind of blue" }).disabled).toBe(true);
    const input = screen.getByRole("spinbutton", { name: "Quantity of Kind of Blue" });
    fireEvent.change(input, { target: { value: "50" } });
    fireEvent.blur(input);
    expect(savedCart()).toEqual([{ product_id: 2, quantity: 2 }]);
  });

  it("lowers a quantity that is now above the stock and says so", async () => {
    mockApi();
    saveCart([{ product_id: 2, quantity: 6 }]); // only 2 left
    renderCart();
    expect(await screen.findByText("Only 2 left, so we changed your quantity from 6 to 2.")).toBeTruthy();
    expect(savedCart()).toEqual([{ product_id: 2, quantity: 2 }]);
  });

  it("removes a product (SHOP-112)", async () => {
    mockApi();
    saveCart([{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 1 }]);
    renderCart();
    await screen.findByRole("link", { name: "Kind of Blue" });
    fireEvent.click(screen.getByRole("button", { name: "Remove Kind of Blue" }));
    expect(savedCart()).toEqual([{ product_id: 1, quantity: 1 }]);
    expect(screen.queryByRole("link", { name: "Kind of Blue" })).toBeNull();
  });

  it("blocks checkout while an out-of-stock or deleted product is in the cart", async () => {
    mockApi();
    saveCart([{ product_id: 3, quantity: 1 }, { product_id: 99, quantity: 1 }]);
    renderCart();
    expect(await screen.findByText("Out of stock")).toBeTruthy();
    expect(screen.getByText("This product is no longer sold.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to checkout" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove Retro Speaker" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Unavailable product" }));
    expect(screen.getByText("There’s nothing in your cart yet.")).toBeTruthy();
  });

  it("shows the number of items in the header cart link", async () => {
    mockApi();
    saveCart([{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }]);
    renderCart();
    expect(screen.getByRole("link", { name: "Cart, 3 items" })).toBeTruthy();
  });

  it("hides the cart link from staff roles", () => {
    mockApi();
    renderCart({ auth: { token: "t", role: "Product Manager" } });
    expect(screen.queryByRole("link", { name: /^Cart/ })).toBeNull();
  });
});
