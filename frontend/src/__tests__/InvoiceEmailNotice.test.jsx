import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../auth/context";
import InvoiceEmailNotice from "../components/InvoiceEmailNotice";
import InvoicePage from "../pages/InvoicePage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const invoice = (extra) => ({
  order_id: 42, created_at: "2026-11-13T10:30:00", status: "processing",
  total_price: "34.99", card_last4: "1111", delivery_address: "Tuzla, Istanbul",
  customer: { name: "Nehir Kazancı", email: "nehir@example.com" },
  items: [{ product_id: 3, product_name: "Kind of Blue", quantity: 1, unit_price: "34.99" }],
  ...extra,
});

describe("InvoiceEmailNotice (SHOP-124)", () => {
  it("says the PDF was sent, to which address", () => {
    render(<InvoiceEmailNotice invoice={invoice({ email_sent: true })} />);
    expect(screen.getByRole("status").textContent)
      .toBe("We’ve e-mailed a PDF copy of this invoice to nehir@example.com.");
  });

  it("says sending failed but the order is confirmed (SHOP-155)", () => {
    render(<InvoiceEmailNotice invoice={invoice({ email_sent: false })} />);
    expect(screen.getByText(/couldn’t e-mail your invoice/)).toBeTruthy();
    expect(screen.getByText(/Your order is confirmed/)).toBeTruthy();
  });

  it("shows nothing while the backend does not report e-mails", () => {
    const { container } = render(<InvoiceEmailNotice invoice={invoice()} />);
    expect(container.textContent).toBe("");
  });

  it("appears on the invoice page after payment", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => ({
      ok: true, status: 200, json: async () => invoice({ email_sent: true }),
    }));
    render(
      <AuthContext.Provider value={{ auth: { token: "t0k", role: "Customer" }, isLoggedIn: true }}>
        <MemoryRouter initialEntries={["/invoice/42"]}>
          <Routes><Route path="/invoice/:orderId" element={<InvoicePage />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(await screen.findByText(/e-mailed a PDF copy/)).toBeTruthy();
    expect(screen.getByText("Payment approved. Thank you for your order!")).toBeTruthy();
  });
});
