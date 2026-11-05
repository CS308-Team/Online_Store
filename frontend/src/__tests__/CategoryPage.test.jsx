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

const renderPage = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/category/:name" element={<CategoryPage />} /></Routes>
  </MemoryRouter>
);

describe("CategoryPage", () => {
  it("asks the API for products of that category", async () => {
    const fetchSpy = mockFetch(() => products);
    renderPage("/category/Vinyl%20Records");
    await screen.findByRole("status");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/products?category_name=Vinyl%20Records");
  });
  it("shows the spinning record while loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    const { container } = renderPage("/category/Turntables");
    expect(container.querySelector(".vinyl")).not.toBeNull();
  });
  it("shows the category name, count and product cards", async () => {
    mockFetch(() => products);
    renderPage("/category/Turntables");
    expect(await screen.findByText("2 products")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Turntables");
    expect(screen.getByText("Rega Planar 1")).toBeTruthy();
    expect(screen.getByText("Audio-Technica LP60X")).toBeTruthy();
  });
  it("uses the singular for one product", async () => {
    mockFetch(() => products.slice(0, 1));
    renderPage("/category/Turntables");
    expect(await screen.findByText("1 product")).toBeTruthy();
  });
  it("shows a message for an empty category", async () => {
    mockFetch(() => []);
    renderPage("/category/CDs");
    expect(await screen.findByText("No products in this category yet.")).toBeTruthy();
  });
  it("shows an error when the API fails", async () => {
    mockFetch(() => new Error());
    renderPage("/category/CDs");
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
