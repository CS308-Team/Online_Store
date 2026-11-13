import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../api/client";
import OutOfStockAlert from "../components/OutOfStockAlert";
import { isOutOfStockError } from "../utils/errors";

afterEach(cleanup);

const renderAlert = (error) => render(<MemoryRouter><OutOfStockAlert error={error} /></MemoryRouter>);

describe("isOutOfStockError", () => {
  it("is true for a 409 from the API", () => {
    expect(isOutOfStockError(new ApiError(409, "Not enough stock"))).toBe(true);
  });
  it("is false for other errors", () => {
    expect(isOutOfStockError(new ApiError(402, "Payment declined by the bank"))).toBe(false);
    expect(isOutOfStockError(null)).toBe(false);
  });
});

describe("OutOfStockAlert", () => {
  it("renders nothing without a stock error", () => {
    const { container } = renderAlert(new ApiError(400, "Card has expired"));
    expect(container.firstChild).toBeNull();
  });
  it("shows the message and a link back to the cart", () => {
    renderAlert(new ApiError(409, "Not enough stock"));
    expect(screen.getByRole("alert").textContent).toContain("no longer available");
    expect(screen.getByText("Back to cart").getAttribute("href")).toBe("/cart");
  });
  it("tells the customer they were not charged", () => {
    renderAlert(new ApiError(409, "Not enough stock"));
    expect(screen.getByText(/not been charged/)).toBeTruthy();
  });
  it("lists the products when the backend sends them", () => {
    renderAlert(new ApiError(409, { items: [{ name: "Rega Planar 1", available: 1 }, { name: "Blue LP", available: 0 }] }));
    expect(screen.getByText("Rega Planar 1: only 1 left")).toBeTruthy();
    expect(screen.getByText("Blue LP: sold out")).toBeTruthy();
  });
});
