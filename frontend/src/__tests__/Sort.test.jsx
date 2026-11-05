import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { parseSort } from "../utils/sort";
import CategoryPage from "../pages/CategoryPage";
import SearchPage from "../pages/SearchPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockFetch(handler) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const body = handler(String(url));
    return { ok: true, status: 200, json: async () => body };
  });
}

const products = [
  { id: 1, name: "Kind of Blue", description: "jazz", price: "34.99", quantity_in_stock: 3, category: "Vinyl Records" },
  { id: 2, name: "Blue Train", description: "jazz", price: "29.99", quantity_in_stock: 0, category: "Vinyl Records" },
];

function ShowUrl() {
  const { pathname, search } = useLocation();
  return <p data-testid="url">{pathname + search}</p>;
}

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/category/:name" element={<CategoryPage />} />
      <Route path="/search" element={<SearchPage />} />
    </Routes>
    <ShowUrl />
  </MemoryRouter>
);

describe("parseSort", () => {
  it("keeps the three backend values", () => {
    expect(parseSort("price_asc")).toBe("price_asc");
    expect(parseSort("price_desc")).toBe("price_desc");
    expect(parseSort("popularity")).toBe("popularity");
  });
  it("ignores unknown or missing values", () => {
    expect(parseSort("cheap")).toBe("");
    expect(parseSort("PRICE_ASC")).toBe("");
    expect(parseSort(null)).toBe("");
  });
});

describe("sort dropdown", () => {
  it("sends no sort parameter by default", async () => {
    const fetchSpy = mockFetch(() => products);
    renderAt("/category/Vinyl%20Records");
    await screen.findByText("Kind of Blue");
    expect(String(fetchSpy.mock.calls[0][0])).not.toContain("sort=");
  });

  it("puts the choice in the URL and asks the API for that order", async () => {
    const fetchSpy = mockFetch(() => products);
    renderAt("/category/Vinyl%20Records");
    fireEvent.change(await screen.findByLabelText("Sort by"), { target: { value: "price_asc" } });
    expect(screen.getByTestId("url").textContent).toBe("/category/Vinyl%20Records?sort=price_asc");
    await vi.waitFor(() =>
      expect(fetchSpy.mock.calls.map((c) => String(c[0]))).toContain("/api/products?category_name=Vinyl%20Records&sort=price_asc"));
  });

  it("reads the sort from the URL on the search page", async () => {
    const fetchSpy = mockFetch(() => products);
    renderAt("/search?q=blue&sort=popularity");
    await screen.findByText("Kind of Blue");
    expect(String(fetchSpy.mock.calls[0][0])).toBe("/api/products?search=blue&sort=popularity");
    expect(screen.getByLabelText("Sort by").value).toBe("popularity");
  });

  it("drops an invalid sort from the URL instead of sending it", async () => {
    const fetchSpy = mockFetch(() => products);
    renderAt("/search?q=blue&sort=cheap");
    await screen.findByText("Kind of Blue");
    expect(String(fetchSpy.mock.calls[0][0])).toBe("/api/products?search=blue");
    expect(screen.getByLabelText("Sort by").value).toBe("");
  });

  it("keeps the products in the order the API returns them", async () => {
    mockFetch(() => [products[1], products[0]]);
    renderAt("/category/Vinyl%20Records?sort=price_asc");
    await screen.findByText("Kind of Blue");
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Blue Train", "Kind of Blue"]);
  });
});
