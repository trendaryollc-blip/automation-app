import React from "react";
import { render, screen } from "@testing-library/react";
import { renderWithProviders } from "./utils";
import { afterEach, vi, test, expect } from "vitest";
import Products from "@/pages/products";

// Mock the api-client-react hook
vi.mock("@workspace/api-client-react", () => ({
  useListProducts: () => ({
    data: [
      {
        id: 1,
        name: "Widget A",
        category: "Gadgets",
        status: "listed",
        costPrice: 5,
        sellPrice: 15,
        margin: 66.6,
        createdAt: new Date().toISOString(),
      },
    ],
    isLoading: false,
  }),
  useCreateProduct: () => ({ mutate: () => {}, mutateAsync: async () => {} }),
  getListProductsQueryKey: () => ["\/api\/products"],
}));

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders product list row", () => {
  renderWithProviders(<Products />);
  expect(screen.getByText("Product Hunting")).toBeTruthy();
  expect(screen.getByText("Widget A")).toBeTruthy();
});
