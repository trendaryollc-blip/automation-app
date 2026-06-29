import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

// Mock URL.createObjectURL/revoke
const createObjectURL = vi.fn(() => "blob:fake");
const revokeObjectURL = vi.fn();
;(global as any).URL = { createObjectURL, revokeObjectURL } as any;

vi.mock("@workspace/api-client-react", () => ({
  useListProducts: () => ({ data: [
    { id: "p1", name: "Widget", category: "Gadgets", status: "listed", costPrice: 10, sellPrice: 20, margin: 50, stockQuantity: 5, stockThreshold: 2, description: "", sourceUrl: "", notes: "" }
  ], isLoading: false }),
  useCreateProduct: () => ({ mutate: vi.fn(), isPending: false }),
  getListProductsQueryKey: () => ["products"],
}));

vi.mock("wouter", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/pages/settings", () => ({
  loadSettings: () => ({
    marginAlertsEnabled: true,
    marginAlertThresholdPct: 40,
    // other default fields omitted for brevity
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import Products from "../../src/pages/products";

test("export via Export CSV button uses URL.createObjectURL", async () => {
  render(<Products />);
  const btn = await screen.findByText("Export CSV");
  btn.click();
  expect(createObjectURL).toHaveBeenCalled();
  expect(revokeObjectURL).toHaveBeenCalled();
});

test("Products page renders product rows", async () => {
  render(<Products />);
  expect(await screen.findByText("Widget")).toBeTruthy();
  expect(screen.getByText("Export CSV")).toBeTruthy();
});
