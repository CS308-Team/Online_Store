import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetailPage from "../pages/ProductDetailPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/products/:id" element={<ProductDetailPage />} /></Routes>
  </MemoryRouter>
);

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
});
