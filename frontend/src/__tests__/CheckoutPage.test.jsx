import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import { AuthContext } from "../auth/context";
import { CartProvider } from "../cart/CartContext";
import { CART_STORAGE_KEY } from "../cart/cartStorage";
import CheckoutPage from "../pages/CheckoutPage";
import { formatCardNumber, formatExpiry, parseExpiry } from "../utils/card";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

const catalog = [
  { id: 1, name: "Classic Turntable", price: 249.99, quantity_in_stock: 5 },
  { id: 2, name: "Kind of Blue", price: "34.99", quantity_in_stock: 2 },
];
const me = { id: 7, name: "Egemen Eser", email: "egemen@example.com", home_address: "Tuzla, Istanbul" };
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

// orderReply: what POST /orders answers
function mockApi({ orderReply = json(201, { order_id: 42, total_price: 319.97, status: "processing" }), products = catalog } = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const path = String(url);
    if (path.endsWith("/orders")) return orderReply;
    if (path.endsWith("/me")) return json(200, me);
    if (path.includes("/products")) return json(200, products);
    return json(404, { detail: "Not Found" });
  });
}

const orderCalls = (fetchMock) => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/orders"));
const saveCart = (items) => localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
const savedCart = () => JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");

function Invoice() {
  return <p>invoice {useParams().orderId}</p>;
}

const renderCheckout = () => render(
  <AuthContext.Provider value={{ auth: { token: "t0k", role: "Customer" }, isLoggedIn: true, logout: () => {} }}>
    <CartProvider>
      <MemoryRouter initialEntries={["/checkout"]}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/invoice/:orderId" element={<Invoice />} />
        </Routes>
      </MemoryRouter>
    </CartProvider>
  </AuthContext.Provider>
);

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillCard() {
  type("Name on card", "Egemen Eser");
  type("Card number", "4111111111111111");
  type("Expiry date", "1230");
  type("Security code", "123");
}

describe("card helpers", () => {
  it("groups the card number in fours", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("4111-1111 11")).toBe("4111 1111 11");
    expect(formatCardNumber("41111111111111119999")).toBe("4111 1111 1111 1111");
  });
  it("writes the expiry date as MM/YY", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("123")).toBe("12/3");
    expect(formatExpiry("12/30")).toBe("12/30");
    expect(parseExpiry("08/27")).toEqual({ month: 8, year: 2027 });
    expect(parseExpiry("8/27")).toBeNull();
  });
});

describe("CheckoutPage", () => {
  it("shows the order and fills in the home address", async () => {
    saveCart([{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 2 }]);
    mockApi();
    renderCheckout();

    expect(await screen.findByText("Classic Turntable × 1")).toBeTruthy();
    expect(screen.getByText("Kind of Blue × 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pay ₺319.97" })).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText("Delivery address").value).toBe("Tuzla, Istanbul"));
  });

  it("formats the card fields while typing", async () => {
    saveCart([{ product_id: 1, quantity: 1 }]);
    mockApi();
    renderCheckout();
    await screen.findByText("Classic Turntable × 1");

    type("Card number", "4111111111111111");
    type("Expiry date", "0830");
    expect(screen.getByLabelText("Card number").value).toBe("4111 1111 1111 1111");
    expect(screen.getByLabelText("Expiry date").value).toBe("08/30");
  });

  it("asks for missing fields and sends nothing", async () => {
    saveCart([{ product_id: 1, quantity: 1 }]);
    const fetchMock = mockApi();
    renderCheckout();
    await screen.findByText("Classic Turntable × 1");
    await waitFor(() => expect(screen.getByLabelText("Delivery address").value).not.toBe(""));
    type("Delivery address", "");

    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));
    expect(screen.getByText("Enter the delivery address.")).toBeTruthy();
    expect(screen.getByText("Enter the name on the card.")).toBeTruthy();
    expect(screen.getByText("Enter the card number.")).toBeTruthy();
    expect(screen.getByText("Enter the expiry date.")).toBeTruthy();
    expect(screen.getByText("Enter the security code.")).toBeTruthy();
    expect(orderCalls(fetchMock)).toHaveLength(0);
  });

  it("places the order, empties the cart and opens the invoice", async () => {
    saveCart([{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 2 }]);
    const fetchMock = mockApi();
    renderCheckout();
    await screen.findByText("Classic Turntable × 1");
    await waitFor(() => expect(screen.getByLabelText("Delivery address").value).toBe("Tuzla, Istanbul"));
    fillCard();

    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));
    expect(await screen.findByText("invoice 42")).toBeTruthy();

    const [[, options]] = orderCalls(fetchMock);
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer t0k");
    expect(JSON.parse(options.body)).toEqual({
      items: [{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 2 }],
      delivery_address: "Tuzla, Istanbul",
      payment: { card_holder: "Egemen Eser", card_number: "4111111111111111", expiry_month: 12, expiry_year: 2030, cvv: "123" },
    });
    expect(savedCart()).toEqual([]);
  });

  it("shows the out of stock message and keeps the cart", async () => {
    saveCart([{ product_id: 2, quantity: 2 }]);
    mockApi({ orderReply: json(409, { detail: "Not enough stock" }) });
    renderCheckout();
    await screen.findByText("Kind of Blue × 2");
    fillCard();

    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));
    expect(await screen.findByText(/no longer available/)).toBeTruthy();
    expect(savedCart()).toEqual([{ product_id: 2, quantity: 2 }]);
  });

  it("does not let the customer pay for items that ran out", async () => {
    saveCart([{ product_id: 2, quantity: 2 }]);
    mockApi({ products: [{ id: 2, name: "Kind of Blue", price: 34.99, quantity_in_stock: 1 }] });
    renderCheckout();
    await screen.findByText("Kind of Blue × 2");

    expect(screen.getByRole("button", { name: /Pay/ }).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "Update your cart" }).getAttribute("href")).toBe("/cart");
  });

  it("says when the cart is empty", () => {
    mockApi();
    renderCheckout();
    expect(screen.getByText("There’s nothing to pay for yet.")).toBeTruthy();
  });
});
