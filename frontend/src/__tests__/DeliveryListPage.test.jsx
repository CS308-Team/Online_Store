import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../auth/context";
import DeliveryListPage from "../pages/DeliveryListPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const deliveries = [
  { id: 11, order_id: 5, customer_id: 3, product_id: 1, product_name: "Rega Planar 1", quantity: 1,
    total_price: "12500.00", delivery_address: "Kadikoy, Istanbul", status: "processing" },
  { id: 12, order_id: 6, customer_id: 4, product_id: 7, product_name: "Blue Train LP", quantity: 2,
    total_price: "1800.00", delivery_address: "Cankaya, Ankara", status: "delivered" },
];

function mockFetch(body, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => ({
    ok: status < 400, status, json: async () => body,
  }));
}

const renderPage = () => render(
  <AuthContext.Provider value={{ auth: { token: "t0k", role: "Product Manager" }, isLoggedIn: true }}>
    <MemoryRouter><DeliveryListPage /></MemoryRouter>
  </AuthContext.Provider>
);

describe("DeliveryListPage", () => {
  it("shows the spinning record while loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector(".vinyl")).not.toBeNull();
  });
  it("sends the token to GET /deliveries", async () => {
    const spy = mockFetch(deliveries);
    renderPage();
    await screen.findByText("Rega Planar 1");
    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toContain("/deliveries");
    expect(options.headers.Authorization).toBe("Bearer t0k");
  });
  it("shows every field of the delivery list", async () => {
    mockFetch(deliveries);
    renderPage();
    expect(await screen.findByText("Rega Planar 1")).toBeTruthy();
    expect(screen.getByText("#11")).toBeTruthy();
    expect(screen.getByText("#3")).toBeTruthy();
    expect(screen.getByText("ID 1")).toBeTruthy();
    expect(screen.getByText("₺12,500")).toBeTruthy();
    expect(screen.getByText("Kadikoy, Istanbul")).toBeTruthy();
  });
  it("marks delivered orders as completed", async () => {
    mockFetch(deliveries);
    renderPage();
    await screen.findByText("Blue Train LP");
    const rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("Processing");
    expect(rows[1].textContent).toContain("No");
    expect(rows[2].textContent).toContain("Delivered");
    expect(rows[2].textContent).toContain("Yes");
  });
  it("counts the orders still to deliver", async () => {
    mockFetch(deliveries);
    renderPage();
    expect(await screen.findByText("1 to deliver · 2 total")).toBeTruthy();
  });
  it("shows a message when there are no deliveries", async () => {
    mockFetch([]);
    renderPage();
    expect(await screen.findByText("No orders to deliver yet.")).toBeTruthy();
  });
  it("shows an error when the request fails", async () => {
    mockFetch({ detail: "boom" }, 500);
    renderPage();
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
