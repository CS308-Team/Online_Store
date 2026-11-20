import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "../cart/CartContext";
import { CART_STORAGE_KEY } from "../cart/cartStorage";
import ProductDetailPage from "../pages/ProductDetailPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

const categories = [{ id: 1, name: "Turntables" }];
const product = (stock) => ({
  id: 7, name: "Classic Turntable", model: "CT-100", serial_number: "SN-TT-0001",
  description: "Belt-drive vinyl player", quantity_in_stock: stock, price: 249.99,
  warranty_status: "2 years", distributor: "Harmony Audio", sold_count: 10, category_id: 1,
});

function mockApi({ item, status = 200 }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    if (String(url).endsWith("/categories")) return { ok: true, status: 200, json: async () => categories };
    if (status !== 200) return { ok: false, status, json: async () => ({ detail: "Product not found" }) };
    return { ok: true, status: 200, json: async () => item };
  });
}

const renderPage = (path = "/products/7") => render(
  <CartProvider>
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/products/:id" element={<ProductDetailPage />} /></Routes>
    </MemoryRouter>
  </CartProvider>
);

const savedCart = () => JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");

describe("ProductDetailPage", () => {
  it("asks the API for that product", async () => {
    const fetchSpy = mockApi({ item: product(5) });
    renderPage();
    await screen.findByRole("heading", { level: 1 });
    expect(fetchSpy.mock.calls.map((c) => String(c[0]))).toContain("/api/products/7");
  });

  it("shows every product property", async () => {
    mockApi({ item: product(5) });
    renderPage();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Classic Turntable");
    for (const text of ["Belt-drive vinyl player", "CT-100", "SN-TT-0001", "2 years", "Harmony Audio"]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getAllByText("Turntables").length).toBeGreaterThan(0); // category name, not id
    expect(screen.getByText("₺249.99")).toBeTruthy();
  });

  it("shows the stock count and an enabled Add to cart when in stock", async () => {
    mockApi({ item: product(5) });
    renderPage();
    expect(await screen.findByText("In stock: 5")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add to cart" }).disabled).toBe(false);
  });

  it("shows Out of stock and disables Add to cart when stock is 0", async () => {
    mockApi({ item: product(0) });
    renderPage();
    expect(await screen.findByText("Out of stock")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add to cart" }).disabled).toBe(true);
  });

  it("shows a not found message for an unknown product", async () => {
    mockApi({ status: 404 });
    renderPage("/products/999");
    expect(await screen.findByText("Product not found")).toBeTruthy();
  });

  it("shows the spinning record while loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector(".vinyl")).not.toBeNull();
  });

  // ---- SHOP-115: Add to cart and quantity limit by stock ----
  it("adds the chosen quantity to the cart", async () => {
    mockApi({ item: product(5) });
    renderPage();
    await screen.findByText("In stock: 5");
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(savedCart()).toEqual([{ product_id: 7, quantity: 2 }]);
    expect(screen.getByText(/Added 2 to your cart/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View cart (2)" }).getAttribute("href")).toBe("/cart");
  });

  it("only lets you add what is left after the cart", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ product_id: 7, quantity: 3 }]));
    mockApi({ item: product(5) });
    renderPage();
    await screen.findByText("In stock: 5");
    const input = screen.getByRole("spinbutton", { name: "Quantity" });
    expect(input.max).toBe("2");
    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.blur(input);
    expect(input.value).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(savedCart()).toEqual([{ product_id: 7, quantity: 5 }]);
  });

  it("disables Add to cart when the whole stock is already in the cart", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ product_id: 7, quantity: 5 }]));
    mockApi({ item: product(5) });
    renderPage();
    await screen.findByText("In stock: 5");
    expect(screen.getByRole("button", { name: "Add to cart" }).disabled).toBe(true);
    expect(screen.getByText(/All 5 in stock are in your cart/)).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });
});
