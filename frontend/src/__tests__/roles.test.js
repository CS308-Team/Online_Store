import { describe, it, expect } from "vitest";
import { menuFor } from "../auth/roles";

const paths = (role) => menuFor(role).map((item) => item.to);

describe("menuFor", () => {
  it("gives guests no extra links", () => {
    expect(paths(undefined)).toEqual([]);
  });
  it("gives customers no admin links", () => {
    expect(paths("Customer")).toEqual([]);
  });
  it("shows the sales panel to sales managers", () => {
    expect(paths("Sales Manager")).toEqual(["/sales"]);
  });
  it("shows the product panel to product managers", () => {
    expect(paths("Product Manager")).toEqual(["/product-manager"]);
  });
  it("shows the support panel to support agents", () => {
    expect(paths("Support Agent")).toEqual(["/support"]);
  });
  it("treats an unknown role like a guest", () => {
    expect(paths("Admin")).toEqual([]);
  });
});
