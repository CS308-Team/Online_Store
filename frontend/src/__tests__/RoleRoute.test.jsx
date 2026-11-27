import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../auth/context";
import RoleRoute from "../auth/RoleRoute";

afterEach(cleanup);

function renderAt(path, auth) {
  return render(
    <AuthContext.Provider value={{ auth, isLoggedIn: Boolean(auth), login: () => {}, logout: () => {} }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/forbidden" element={<p>forbidden page</p>} />
          <Route element={<RoleRoute allowed={["Product Manager"]} />}>
            <Route path="/product-manager" element={<p>product panel</p>} />
          </Route>
          <Route element={<RoleRoute allowed={["Sales Manager"]} />}>
            <Route path="/sales" element={<p>sales panel</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("RoleRoute", () => {
  it("sends guests to the login page", () => {
    renderAt("/product-manager", null);
    expect(screen.getByText("login page")).toBeTruthy();
  });
  it("lets a product manager in", () => {
    renderAt("/product-manager", { role: "Product Manager" });
    expect(screen.getByText("product panel")).toBeTruthy();
  });
  it("blocks a customer from the product panel", () => {
    renderAt("/product-manager", { role: "Customer" });
    expect(screen.getByText("forbidden page")).toBeTruthy();
  });
  it("blocks a sales manager from the product panel", () => {
    renderAt("/product-manager", { role: "Sales Manager" });
    expect(screen.getByText("forbidden page")).toBeTruthy();
  });
  it("blocks a support agent from the product panel", () => {
    renderAt("/product-manager", { role: "Support Agent" });
    expect(screen.getByText("forbidden page")).toBeTruthy();
  });
  it("lets a sales manager into the sales panel", () => {
    renderAt("/sales", { role: "Sales Manager" });
    expect(screen.getByText("sales panel")).toBeTruthy();
  });
  it("blocks a product manager from the sales panel", () => {
    renderAt("/sales", { role: "Product Manager" });
    expect(screen.getByText("forbidden page")).toBeTruthy();
  });
});
