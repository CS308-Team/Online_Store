import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CategoryMenu from "../components/CategoryMenu";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockFetch(handler) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const body = handler(String(url));
    if (body instanceof Error) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  });
}

const categories = [{ id: 1, name: "Turntables" }, { id: 2, name: "Vinyl Records" }];
describe("CategoryMenu", () => {
  it("links each category to its page", async () => {
    mockFetch(() => categories);
    render(<MemoryRouter><CategoryMenu /></MemoryRouter>);
    const link = await screen.findByText("Vinyl Records");
    expect(link.getAttribute("href")).toBe("/category/Vinyl%20Records");
    expect(screen.getByText("Turntables")).toBeTruthy();
  });
  it("renders nothing when the request fails", async () => {
    mockFetch(() => new Error());
    const { container } = render(<MemoryRouter><CategoryMenu /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector(".category-menu")).toBeNull();
  });
});
