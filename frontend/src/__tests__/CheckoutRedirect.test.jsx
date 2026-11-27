import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { AuthContext } from "../auth/context";
import RoleRoute from "../auth/RoleRoute";
import { safeReturnPath } from "../auth/redirect";
import { CartProvider } from "../cart/CartContext";
import { CART_STORAGE_KEY } from "../cart/cartStorage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

const tokenFor = (role) =>
  `x.${btoa(JSON.stringify({ sub: "7", role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.y`;
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

function mockApi(role = "Customer") {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    if (String(url).endsWith("/login")) return json(200, { access_token: tokenFor(role), token_type: "bearer", role });
    if (String(url).endsWith("/register")) return json(201, { id: 7, name: "Egemen Eser", email: "egemen@example.com" });
    return json(404, { detail: "Not Found" });
  });
}

const routes = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forbidden" element={<p>forbidden page</p>} />
    <Route path="/cart" element={<p>cart page</p>} />
    <Route path="/" element={<p>home page</p>} />
    <Route path="/sales" element={<p>sales panel</p>} />
    <Route element={<RoleRoute allowed={["Customer"]} />}>
      <Route path="/checkout" element={<p>checkout page</p>} />
    </Route>
  </Routes>
);

const renderApp = (path) => render(
  <AuthProvider>
    <CartProvider>
      <MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>
    </CartProvider>
  </AuthProvider>
);

const renderAs = (path, auth) => render(
  <AuthContext.Provider value={{ auth, isLoggedIn: Boolean(auth), login: () => {}, logout: () => {} }}>
    <CartProvider>
      <MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>
    </CartProvider>
  </AuthContext.Provider>
);

function logIn() {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "egemen@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("safeReturnPath", () => {
  it("accepts paths on this site", () => {
    expect(safeReturnPath({ pathname: "/checkout", search: "" })).toBe("/checkout");
    expect(safeReturnPath({ pathname: "/products/3", search: "?tab=1" })).toBe("/products/3?tab=1");
    expect(safeReturnPath("/checkout")).toBe("/checkout");
  });
  it("rejects other websites and the login pages", () => {
    expect(safeReturnPath("https://evil.example")).toBeNull();
    expect(safeReturnPath("//evil.example")).toBeNull();
    expect(safeReturnPath("/\\evil.example")).toBeNull();
    expect(safeReturnPath("/login")).toBeNull();
    expect(safeReturnPath(undefined)).toBeNull();
  });
});

describe("checkout for guests", () => {
  it("sends a guest to the login page with a checkout message", () => {
    renderApp("/checkout");
    expect(screen.getByRole("heading", { name: "Log in" })).toBeTruthy();
    expect(screen.getByText(/Log in to continue to checkout/)).toBeTruthy();
  });

  it("brings the customer back to checkout after login", async () => {
    mockApi("Customer");
    renderApp("/checkout");
    logIn();
    expect(await screen.findByText("checkout page")).toBeTruthy();
  });

  it("goes back to checkout even with a guest cart", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ product_id: 1, quantity: 1 }]));
    mockApi("Customer");
    renderApp("/checkout");
    logIn();
    expect(await screen.findByText("checkout page")).toBeTruthy();
  });

  it("sends staff to their own home page instead of checkout", async () => {
    mockApi("Sales Manager");
    renderApp("/checkout");
    logIn();
    expect(await screen.findByText("sales panel")).toBeTruthy();
  });

  it("keeps the checkout return through sign up", async () => {
    mockApi("Customer");
    renderApp("/checkout");
    fireEvent.click(screen.getByRole("link", { name: "Sign up" }));

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Egemen Eser" } });
    fireEvent.change(screen.getByLabelText("Tax ID"), { target: { value: "12345678901" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "egemen@example.com" } });
    fireEvent.change(screen.getByLabelText("Home address"), { target: { value: "Tuzla, Istanbul" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText(/Your account has been created/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("checkout page")).toBeTruthy();
  });

  it("lets a logged-in customer open checkout", () => {
    renderAs("/checkout", { role: "Customer", token: "t0k" });
    expect(screen.getByText("checkout page")).toBeTruthy();
  });

  it("blocks staff from checkout", () => {
    renderAs("/checkout", { role: "Product Manager", token: "t0k" });
    expect(screen.getByText("forbidden page")).toBeTruthy();
  });
});
