import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../auth/context";
import InvoicePage from "../pages/InvoicePage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const invoice = {
  order_id: 42, created_at: "2026-11-13T10:30:00", status: "processing",
  total_price: "14300.00", card_last4: "4242", delivery_address: "Moda Cd. 10, Kadikoy, Istanbul",
  customer: { name: "Ipek Gezer", email: "ipek@example.com", tax_id: "12345678901" },
  items: [
    { product_id: 1, product_name: "Rega Planar 1", quantity: 1, unit_price: "12500.00" },
    { product_id: 7, product_name: "Blue Train LP", quantity: 2, unit_price: "900.00" },
  ],
};

function mockFetch(body, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => ({
    ok: status < 400, status, json: async () => body,
  }));
}

const renderPage = (path = "/invoice/42") => render(
  <AuthContext.Provider value={{ auth: { token: "t0k", role: "Customer" }, isLoggedIn: true }}>
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/invoice/:orderId" element={<InvoicePage />} /></Routes>
    </MemoryRouter>
  </AuthContext.Provider>
);

describe("InvoicePage", () => {
  it("shows the spinning record while loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector(".vinyl")).not.toBeNull();
  });
  it("asks for the invoice of the order with the token", async () => {
    const spy = mockFetch(invoice);
    renderPage();
    await screen.findByText("#42");
    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toContain("/orders/42/invoice");
    expect(options.headers.Authorization).toBe("Bearer t0k");
  });
  it("shows the customer, address and card", async () => {
    mockFetch(invoice);
    renderPage();
    await screen.findByText("#42");
    expect(screen.getByText(/Ipek Gezer/)).toBeTruthy();
    expect(screen.getByText(/Tax ID 12345678901/)).toBeTruthy();
    expect(screen.getByText("Moda Cd. 10, Kadikoy, Istanbul")).toBeTruthy();
    expect(screen.getByText("Card ending in 4242")).toBeTruthy();
    expect(screen.getByText("13 November 2026")).toBeTruthy();
  });
  it("lists the items with line amounts and the total", async () => {
    mockFetch(invoice);
    renderPage();
    await screen.findByText("Blue Train LP");
    expect(screen.getByText("₺1,800")).toBeTruthy();
    expect(screen.getByText("₺14,300")).toBeTruthy();
  });
  it("prints when the print button is pressed", async () => {
    mockFetch(invoice);
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderPage();
    fireEvent.click(await screen.findByText("Print invoice"));
    expect(print).toHaveBeenCalled();
  });
  it("shows not found for someone else's or a missing invoice", async () => {
    mockFetch({ detail: "Order not found" }, 404);
    renderPage("/invoice/999");
    expect(await screen.findByText("We couldn't find this invoice")).toBeTruthy();
  });
  it("shows an error when the server fails", async () => {
    mockFetch({ detail: "boom" }, 500);
    renderPage();
    expect(await screen.findByText("Couldn't load the invoice")).toBeTruthy();
  });
});
