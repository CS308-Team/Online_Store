import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ApiError } from "../api/client";
import { AuthContext } from "../auth/context";
import { CartProvider } from "../cart/CartContext";
import { CART_STORAGE_KEY } from "../cart/cartStorage";
import CheckoutPage from "../pages/CheckoutPage";
import { describePaymentError, validateCheckout, validateExpiry } from "../utils/checkout";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

const NOW = new Date(2026, 10, 18); // 18 November 2026
const valid = {
  deliveryAddress: "Tuzla, Istanbul",
  cardHolder: "Egemen Eser",
  cardNumber: "4111 1111 1111 1111",
  expiry: "12/30",
  cvv: "123",
};
const errorsFor = (changes) => validateCheckout({ ...valid, ...changes }, NOW);

describe("validateCheckout", () => {
  it("accepts a complete form", () => {
    expect(validateCheckout(valid, NOW)).toEqual({});
  });
  it("checks the delivery address", () => {
    expect(errorsFor({ deliveryAddress: "Abc" }).deliveryAddress).toBe("Address must be at least 5 characters.");
  });
  it("checks the name on the card", () => {
    expect(errorsFor({ cardHolder: "E" }).cardHolder).toBe("Name on card must be at least 2 characters.");
    expect(errorsFor({ cardHolder: "x".repeat(101) }).cardHolder).toBe("Name on card can be at most 100 characters.");
    expect(errorsFor({ cardHolder: "Egemen 4" }).cardHolder).toBe("Name on card cannot contain numbers.");
  });
  it("needs exactly 16 card digits", () => {
    expect(errorsFor({ cardNumber: "4111 1111 1111" }).cardNumber).toBe("Card number must be 16 digits.");
    expect(errorsFor({ cardNumber: "4111111111111111" }).cardNumber).toBeUndefined();
  });
  it("needs a 3 digit security code", () => {
    expect(errorsFor({ cvv: "12" }).cvv).toBe("Security code must be 3 digits.");
    expect(errorsFor({ cvv: "12a" }).cvv).toBe("Security code must be 3 digits.");
  });
});

describe("validateExpiry", () => {
  it("accepts the current month and later", () => {
    expect(validateExpiry("11/26", NOW)).toBe("");
    expect(validateExpiry("01/27", NOW)).toBe("");
  });
  it("rejects expired cards", () => {
    expect(validateExpiry("10/26", NOW)).toBe("This card has expired.");
    expect(validateExpiry("12/25", NOW)).toBe("This card has expired.");
  });
  it("rejects impossible dates", () => {
    expect(validateExpiry("13/27", NOW)).toBe("Enter a month between 01 and 12.");
    expect(validateExpiry("00/27", NOW)).toBe("Enter a month between 01 and 12.");
    expect(validateExpiry("1227", NOW)).toBe("Enter the expiry date as MM/YY.");
    expect(validateExpiry("12/99", NOW)).toBe("Check the expiry year.");
  });
});

describe("describePaymentError", () => {
  it("explains an expired card", () => {
    const info = describePaymentError(new ApiError(400, "Card has expired"));
    expect(info.fieldErrors.expiry).toBe("This card has expired.");
    expect(info.message).toContain("not been charged");
    expect(info.clearCvv).toBe(true);
  });
  it("explains a declined payment", () => {
    const info = describePaymentError(new ApiError(402, "Payment declined by the bank"));
    expect(info.message).toContain("declined");
    expect(info.message).toContain("not been charged");
    expect(info.clearCvv).toBe(true);
  });
  it("asks to log in again on 401", () => {
    expect(describePaymentError(new ApiError(401, "Token has expired")).loggedOut).toBe(true);
  });
  it("points to the cart when a product is gone", () => {
    expect(describePaymentError(new ApiError(404, "Product not found")).updateCart).toBe(true);
  });
  it("leaves stock problems to the out of stock message", () => {
    expect(describePaymentError(new ApiError(409, "Not enough stock"))).toEqual({ outOfStock: true });
  });
  it("marks the fields the server refused", () => {
    const info = describePaymentError(new ApiError(422, [
      { loc: ["body", "payment", "card_number"], msg: "bad" },
      { loc: ["body", "payment", "expiry_year"], msg: "bad" },
      { loc: ["body", "delivery_address"], msg: "bad" },
    ]));
    expect(Object.keys(info.fieldErrors).sort()).toEqual(["cardNumber", "deliveryAddress", "expiry"]);
  });
  it("does not claim the customer was not charged when the result is unknown", () => {
    expect(describePaymentError(new ApiError(0, "offline")).message).not.toContain("charged");
    expect(describePaymentError(new ApiError(500, null)).message).not.toContain("charged");
  });
});

// ---- On the page ----

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

function mockApi(orderReply) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const path = String(url);
    if (path.endsWith("/orders")) return orderReply;
    if (path.endsWith("/me")) return json(200, { home_address: "Tuzla, Istanbul" });
    if (path.includes("/products")) return json(200, [{ id: 1, name: "Classic Turntable", price: 249.99, quantity_in_stock: 5 }]);
    return json(404, { detail: "Not Found" });
  });
}

function renderCheckout(logout = () => {}) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ product_id: 1, quantity: 1 }]));
  return render(
    <AuthContext.Provider value={{ auth: { token: "t0k", role: "Customer" }, isLoggedIn: true, logout }}>
      <CartProvider>
        <MemoryRouter initialEntries={["/checkout"]}>
          <Routes><Route path="/checkout" element={<CheckoutPage />} /></Routes>
        </MemoryRouter>
      </CartProvider>
    </AuthContext.Provider>
  );
}

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function payWithCard() {
  await screen.findByText("Classic Turntable × 1");
  type("Delivery address", "Tuzla, Istanbul");
  type("Name on card", "Egemen Eser");
  type("Card number", "4000000000000002");
  type("Expiry date", "1230");
  type("Security code", "123");
  fireEvent.click(screen.getByRole("button", { name: /Pay/ }));
}

describe("CheckoutPage errors", () => {
  it("checks a field when the customer leaves it", async () => {
    mockApi(json(201, { order_id: 1 }));
    renderCheckout();
    await screen.findByText("Classic Turntable × 1");

    type("Card number", "4111 1111");
    fireEvent.blur(screen.getByLabelText("Card number"));
    expect(screen.getByText("Card number must be 16 digits.")).toBeTruthy();

    type("Card number", "4111111111111111");
    expect(screen.queryByText("Card number must be 16 digits.")).toBeNull();
  });

  it("does not send the order with an expired card", async () => {
    const fetchMock = mockApi(json(201, { order_id: 1 }));
    renderCheckout();
    await screen.findByText("Classic Turntable × 1");
    type("Name on card", "Egemen Eser");
    type("Card number", "4111111111111111");
    type("Expiry date", "0120");
    type("Security code", "123");
    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));

    expect(screen.getByText("This card has expired.")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/orders"))).toBe(false);
  });

  it("shows a declined payment, clears the security code and keeps the cart", async () => {
    mockApi(json(402, { detail: "Payment declined by the bank" }));
    renderCheckout();
    await payWithCard();

    expect((await screen.findByRole("alert")).textContent).toContain("Your bank declined the payment");
    expect(screen.getByLabelText("Security code").value).toBe("");
    expect(screen.getByLabelText("Card number").value).toBe("4000 0000 0000 0002");
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY))).toEqual([{ product_id: 1, quantity: 1 }]);
  });

  it("marks the expiry date when the server says the card expired", async () => {
    mockApi(json(400, { detail: "Card has expired" }));
    renderCheckout();
    await payWithCard();

    expect((await screen.findByRole("alert")).textContent).toContain("This card has expired");
    expect(screen.getByText("This card has expired.", { selector: ".field-error" })).toBeTruthy();
  });

  it("logs the customer out when the login expired", async () => {
    const logout = vi.fn();
    mockApi(json(401, { detail: "Token has expired" }));
    renderCheckout(logout);
    await payWithCard();

    await vi.waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it("links to the cart when a product is no longer sold", async () => {
    mockApi(json(404, { detail: "Product not found" }));
    renderCheckout();
    await payWithCard();

    expect((await screen.findByRole("alert")).textContent).toContain("no longer sold");
    expect(screen.getByRole("link", { name: "Go to cart" }).getAttribute("href")).toBe("/cart");
  });

  it("explains a connection problem without promising anything", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).endsWith("/orders")) throw new TypeError("offline");
      if (String(url).endsWith("/me")) return json(200, {});
      return json(200, [{ id: 1, name: "Classic Turntable", price: 249.99, quantity_in_stock: 5 }]);
    });
    renderCheckout();
    await payWithCard();

    expect((await screen.findByRole("alert")).textContent).toContain("Could not reach the server");
  });
});
