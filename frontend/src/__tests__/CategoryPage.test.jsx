import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CategoryPage from "../pages/CategoryPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockFetch(handler) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const body = handler(String(url));
    if (body instanceof Error) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  });
}

const products = [
  { id: 1, name: "Rega Planar 1", model: "P1", price: "12500.00", quantity_in_stock: 4, category: "Turntables" },
  { id: 2, name: "Audio-Technica LP60X", model: "LP60X", price: "6200.00", quantity_in_stock: 0, category: "Turntables" },
];

const categories = [{ id: 1, name: "Turntables" }, { id: 2, name: "Vinyl Records" }, { id: 3, name: "CDs" }];

// answers /categories with the category list and /products with the given body
const api = (productsBody) => mockFetch((url) => (url.endsWith("/categories") ? categories : productsBody));

const renderPage = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/category/:name" element={<CategoryPage />} /></Routes>
  </MemoryRouter>
);

describe("CategoryPage", () => {
  it("asks the API for products of that category", async () => {
    const fetchSpy = api(products);
    renderPage("/category/Vinyl%20Records");
    await screen.findByRole("status");
    const urls = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.includes("/products?category_name=Vinyl%20Records"))).toBe(true);
  });
  it("shows the spinning record while loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    const { container } = renderPage("/category/Turntables");
    expect(container.querySelector(".vinyl")).not.toBeNull();
  });
  it("shows the category name, count and product cards", async () => {
    api(products);
    renderPage("/category/Turntables");
    expect(await screen.findByText("2 products")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Turntables");
    expect(screen.getByText("Rega Planar 1")).toBeTruthy();
    expect(screen.getByText("Audio-Technica LP60X")).toBeTruthy();
  });
  it("uses the singular for one product", async () => {
    api(products.slice(0, 1));
    renderPage("/category/Turntables");
    expect(await screen.findByText("1 product")).toBeTruthy();
  });
  it("shows a message for an empty category", async () => {
    api([]);
    renderPage("/category/CDs");
    expect(await screen.findByText("No products in this category yet.")).toBeTruthy();
  });
  it("shows not found for a category that doesn't exist", async () => {
    api([]);
    renderPage("/category/Banjos");
    expect(await screen.findByText("Not found")).toBeTruthy();
    expect(screen.queryByText("0 products")).toBeNull();
  });
  it("shows an error when the API fails", async () => {
    mockFetch(() => new Error());
    renderPage("/category/CDs");
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
