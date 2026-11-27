import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { CartProvider } from "../cart/CartContext";
import { CART_STORAGE_KEY } from "../cart/cartStorage";
import { mergeGuestCart, normalizeCart } from "../api/cart";
import LoginPage from "../pages/LoginPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

const tokenFor = (role) =>
  `x.${btoa(JSON.stringify({ sub: "7", role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.y`;

const saveCart = (items) => localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
const savedCart = () => JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

// mergeReply: what POST /cart/merge answers (a response object or an Error to throw)
function mockApi({ role = "Customer", mergeReply }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    if (String(url).endsWith("/login")) return json(200, { access_token: tokenFor(role), token_type: "bearer", role });
    if (String(url).endsWith("/cart/merge")) {
      if (mergeReply instanceof Error) throw mergeReply;
      return mergeReply;
    }
    return json(404, { detail: "Not Found" });
  });
}

const mergeCalls = (fetchMock) => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/cart/merge"));

function renderLogin() {
  render(
    <AuthProvider>
      <CartProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cart" element={<p>cart page</p>} />
            <Route path="/" element={<p>home page</p>} />
            <Route path="/product-manager" element={<p>product panel</p>} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </AuthProvider>
  );
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "egemen@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("normalizeCart", () => {
  it("reads the backend's { cart, adjusted } answer", () => {
    expect(normalizeCart({
      cart: [{ product_id: 1, quantity: 2, name: "Classic Turntable", price: 249.99, quantity_in_stock: 5 }],
      adjusted: [{ product_id: 1, requested: 7, added: 5 }],
    })).toEqual([{ product_id: 1, quantity: 2 }]);
    expect(normalizeCart({ cart: [], adjusted: [] })).toEqual([]);
  });
  it("accepts a plain list or an { items } object", () => {
    expect(normalizeCart([{ product_id: 1, quantity: 2 }])).toEqual([{ product_id: 1, quantity: 2 }]);
    expect(normalizeCart({ items: [{ product_id: 3, quantity: 1 }] })).toEqual([{ product_id: 3, quantity: 1 }]);
  });
  it("drops broken and repeated rows and keeps only id and quantity", () => {
    expect(normalizeCart([
      { product_id: 1, quantity: 2, price: 10 },
      { product_id: 1, quantity: 5 },
      { product_id: "2", quantity: "3" },
      { product_id: 0, quantity: 1 },
      { product_id: 4, quantity: 0 },
      null,
    ])).toEqual([{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 3 }]);
  });
  it("returns null for an answer without a cart, so the cart is not emptied", () => {
    expect(normalizeCart(null)).toBeNull();
    expect(normalizeCart({ status: "ok" })).toBeNull();
  });
});

describe("mergeGuestCart", () => {
  it("posts the guest cart with the login token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(200, [{ product_id: 1, quantity: 3 }]));
    const items = await mergeGuestCart([{ product_id: 1, quantity: 1 }], "t0k");
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/cart/merge");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer t0k");
    expect(JSON.parse(options.body)).toEqual({ items: [{ product_id: 1, quantity: 1 }] });
    expect(items).toEqual([{ product_id: 1, quantity: 3 }]);
  });
  it("returns null when the backend has no merge endpoint yet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(404, { detail: "Not Found" }));
    expect(await mergeGuestCart([], "t0k")).toBeNull();
  });
  it("throws other errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(500, null));
    await expect(mergeGuestCart([], "t0k")).rejects.toMatchObject({ status: 500 });
  });
});

describe("login with a guest cart", () => {
  it("replaces the cart with the merged cart and opens the cart page", async () => {
    saveCart([{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 2 }]);
    const fetchMock = mockApi({ mergeReply: json(200, [
      { product_id: 1, quantity: 3 }, { product_id: 2, quantity: 2 }, { product_id: 5, quantity: 1 },
    ]) });
    renderLogin();

    expect(await screen.findByText("cart page")).toBeTruthy();
    const [[, options]] = mergeCalls(fetchMock);
    expect(JSON.parse(options.body).items).toEqual([{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 2 }]);
    expect(options.headers.Authorization).toBe(`Bearer ${tokenFor("Customer")}`);
    expect(savedCart()).toEqual([
      { product_id: 1, quantity: 3 }, { product_id: 2, quantity: 2 }, { product_id: 5, quantity: 1 },
    ]);
  });

  it("uses the cart from the backend's { cart, adjusted } answer", async () => {
    saveCart([{ product_id: 1, quantity: 1 }]);
    mockApi({ mergeReply: json(200, {
      cart: [{ product_id: 1, quantity: 3, name: "Classic Turntable", price: 249.99, quantity_in_stock: 3 }],
      adjusted: [{ product_id: 1, requested: 4, added: 3 }],
    }) });
    renderLogin();

    expect(await screen.findByText("cart page")).toBeTruthy();
    expect(savedCart()).toEqual([{ product_id: 1, quantity: 3 }]);
  });

  it("keeps the cart when the merge answer has an unknown shape", async () => {
    saveCart([{ product_id: 1, quantity: 2 }]);
    mockApi({ mergeReply: json(200, { status: "ok" }) });
    renderLogin();

    expect(await screen.findByText("cart page")).toBeTruthy();
    expect(savedCart()).toEqual([{ product_id: 1, quantity: 2 }]);
  });

  it("keeps the cart on this device when the merge endpoint does not exist yet", async () => {
    saveCart([{ product_id: 1, quantity: 2 }]);
    mockApi({ mergeReply: json(404, { detail: "Not Found" }) });
    renderLogin();

    expect(await screen.findByText("cart page")).toBeTruthy();
    expect(savedCart()).toEqual([{ product_id: 1, quantity: 2 }]);
  });

  it("still logs in and keeps the cart when the merge fails", async () => {
    saveCart([{ product_id: 1, quantity: 2 }]);
    mockApi({ mergeReply: new TypeError("network down") });
    renderLogin();

    expect(await screen.findByText("cart page")).toBeTruthy();
    expect(savedCart()).toEqual([{ product_id: 1, quantity: 2 }]);
  });

  it("loads the account's saved cart and goes home when the guest cart is empty", async () => {
    const fetchMock = mockApi({ mergeReply: json(200, { items: [{ product_id: 4, quantity: 1 }] }) });
    renderLogin();

    expect(await screen.findByText("home page")).toBeTruthy();
    expect(JSON.parse(mergeCalls(fetchMock)[0][1].body)).toEqual({ items: [] });
    expect(savedCart()).toEqual([{ product_id: 4, quantity: 1 }]);
  });

  it("does not touch the cart for staff accounts", async () => {
    saveCart([{ product_id: 1, quantity: 2 }]);
    const fetchMock = mockApi({ role: "Product Manager", mergeReply: json(200, []) });
    renderLogin();

    expect(await screen.findByText("product panel")).toBeTruthy();
    expect(mergeCalls(fetchMock)).toHaveLength(0);
    expect(savedCart()).toEqual([{ product_id: 1, quantity: 2 }]);
  });
});
