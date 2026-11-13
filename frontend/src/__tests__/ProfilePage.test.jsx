import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../auth/context";
import ProfilePage from "../pages/ProfilePage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const me = {
  id: 7, name: "Nehir Kazancı", email: "nehir@example.com", tax_id: "12345678901",
  home_address: "Orta Mah. Üniversite Cd. 27, Tuzla, Istanbul", role: "Customer",
};

function mockFetch(body, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => ({
    ok: status < 400, status, json: async () => body,
  }));
}

const renderPage = (logout = vi.fn()) => {
  render(
    <AuthContext.Provider value={{ auth: { token: "t0k", role: "Customer" }, isLoggedIn: true, logout }}>
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes><Route path="/profile" element={<ProfilePage />} /></Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
  return logout;
};

describe("ProfilePage (SHOP-126)", () => {
  it("shows the spinning record while loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(document.querySelector(".vinyl")).not.toBeNull();
  });

  it("asks GET /me with the login token", async () => {
    const spy = mockFetch(me);
    renderPage();
    await screen.findByRole("heading", { level: 1 });
    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toBe("/api/me");
    expect(options.headers.Authorization).toBe("Bearer t0k");
  });

  it("shows the name, e-mail and home address", async () => {
    mockFetch(me);
    renderPage();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Nehir Kazancı");
    expect(screen.getByText("nehir@example.com")).toBeTruthy();
    expect(screen.getByText("Orta Mah. Üniversite Cd. 27, Tuzla, Istanbul")).toBeTruthy();
  });

  it("does not show the tax ID", async () => {
    mockFetch(me);
    renderPage();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("12345678901")).toBeNull();
  });

  it("logs out when the token is refused", async () => {
    mockFetch({ detail: "Invalid token" }, 401);
    const logout = renderPage();
    await vi.waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it("shows an error with a retry button for other failures", async () => {
    mockFetch({ detail: "boom" }, 500);
    renderPage();
    expect(await screen.findByText("Couldn't load your profile. Please try again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
