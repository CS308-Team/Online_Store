import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../auth/context";
import OrderHistoryPage from "../pages/OrderHistoryPage";
import { normalizeStatus, statusInfo } from "../utils/orderStatus";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const orders = [
  {
    order_id: 3, created_at: "2026-11-02T09:00:00", status: "delivered", total_price: "34.99",
    items: [{ product_id: 3, product_name: "Kind of Blue", quantity: 1, unit_price: "34.99" }],
  },
  {
    order_id: 8, created_at: "2026-11-15T14:20:00", status: "processing", total_price: "534.97",
    items: [
      { product_id: 1, product_name: "Classic Turntable", quantity: 2, unit_price: "249.99" },
      { product_id: 3, product_name: "Kind of Blue", quantity: 1, unit_price: "34.99" },
    ],
  },
  {
    order_id: 5, created_at: "2026-11-10T11:00:00", status: "in-transit", total_price: "149.99",
    items: [{ product_id: 7, product_name: "Studio Headphones", quantity: 1, unit_price: "149.99" }],
  },
];

function mockFetch(body, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => ({
    ok: status < 400, status, json: async () => body,
  }));
}

const renderPage = (logout = vi.fn()) => {
  render(
    <AuthContext.Provider value={{ auth: { token: "t0k", role: "Customer" }, isLoggedIn: true, logout }}>
      <MemoryRouter initialEntries={["/orders"]}>
        <Routes><Route path="/orders" element={<OrderHistoryPage />} /></Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
  return logout;
};

const card = (n) => screen.getByRole("heading", { name: `Order #${n}` }).closest("li");

describe("order status helpers", () => {
  it("understands the backend's spellings of a status", () => {
    for (const v of ["in-transit", "In transit", "in_transit", "IN-TRANSIT"]) expect(normalizeStatus(v)).toBe("in-transit");
    expect(statusInfo("delivered")).toMatchObject({ label: "Delivered", step: 3 });
  });

  it("still shows an unknown status as text", () => {
    expect(statusInfo("cancelled")).toMatchObject({ label: "cancelled", tone: "unknown", step: 0 });
  });
});

describe("OrderHistoryPage (SHOP-125)", () => {
  it("shows the spinning record while loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(document.querySelector(".vinyl")).not.toBeNull();
  });

  it("asks GET /orders with the login token", async () => {
    const spy = mockFetch(orders);
    renderPage();
    await screen.findByRole("heading", { name: "Your orders" });
    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toBe("/api/orders");
    expect(options.headers.Authorization).toBe("Bearer t0k");
  });

  it("lists the orders newest first", async () => {
    mockFetch(orders);
    renderPage();
    await screen.findByRole("heading", { name: "Order #8" });
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Order #8", "Order #5", "Order #3"]);
    expect(screen.getByText("3 orders")).toBeTruthy();
  });

  it("shows a status badge for each order", async () => {
    mockFetch(orders);
    renderPage();
    await screen.findByRole("heading", { name: "Order #8" });
    expect(within(card(8)).getByText("Processing", { selector: ".tag" })).toBeTruthy();
    expect(within(card(5)).getByText("In transit", { selector: ".tag" })).toBeTruthy();
    expect(within(card(3)).getByText("Delivered", { selector: ".tag" })).toBeTruthy();
  });

  it("marks how far the delivery has come", async () => {
    mockFetch(orders);
    renderPage();
    await screen.findByRole("heading", { name: "Order #5" });
    const steps = within(card(5)).getByRole("list", { name: "Delivery progress" });
    const done = within(steps).getAllByRole("listitem").map((li) => li.classList.contains("is-done"));
    expect(done).toEqual([true, true, false]);
  });

  it("shows the products, the total and a link to the invoice", async () => {
    mockFetch(orders);
    renderPage();
    await screen.findByRole("heading", { name: "Order #8" });
    const order = card(8);
    expect(within(order).getByRole("link", { name: "Classic Turntable" }).getAttribute("href")).toBe("/products/1");
    expect(within(order).getByText("₺499.98")).toBeTruthy();
    expect(within(order).getByText(/534\.97/)).toBeTruthy();
    expect(within(order).getByRole("link", { name: "View invoice" }).getAttribute("href")).toBe("/invoice/8");
    expect(within(order).getByText("Ordered 15 November 2026")).toBeTruthy();
  });

  it("accepts { orders: [...] } and id instead of order_id", async () => {
    mockFetch({ orders: [{ id: 12, created_at: "2026-11-01", status: "processing", total_price: 10, items: [] }] });
    renderPage();
    expect(await screen.findByRole("heading", { name: "Order #12" })).toBeTruthy();
  });

  it("shows an empty state when there are no orders", async () => {
    mockFetch([]);
    renderPage();
    expect(await screen.findByText("You haven’t ordered anything yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse products" }).getAttribute("href")).toBe("/");
  });

  it("logs out when the token is refused", async () => {
    mockFetch({ detail: "Invalid token" }, 401);
    const logout = renderPage();
    await vi.waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it("shows an error with a retry button, and retries", async () => {
    const spy = mockFetch({ detail: "boom" }, 500);
    renderPage();
    expect(await screen.findByText("Couldn't load your orders. Please try again.")).toBeTruthy();
    spy.mockImplementation(async () => ({ ok: true, status: 200, json: async () => orders }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Order #8" })).toBeTruthy();
  });
});
