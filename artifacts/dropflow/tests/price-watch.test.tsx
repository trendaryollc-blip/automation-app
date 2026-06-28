import React from "react";
import { render, screen } from "@testing-library/react";
import { renderWithProviders } from "./utils";
import { afterEach, vi, test, expect } from "vitest";
import PriceWatchPage from "@/pages/price-watch";

vi.mock("@workspace/api-client-react", () => ({
  useListPriceWatches: () => ({ data: [], refetch: () => {} }),
  useCreatePriceWatch: () => ({
    mutate: () => {},
    mutateAsync: async () => {},
  }),
  useDeletePriceWatch: () => ({ mutateAsync: async () => {} }),
  useListPriceSnapshots: (id?: number) => ({ data: [], refetch: () => {} }),
  useAddPriceSnapshot: () => ({ mutateAsync: async () => {} }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders price watch empty state", () => {
  renderWithProviders(<PriceWatchPage />);
  expect(screen.getByText("Price Watch")).toBeTruthy();
  expect(screen.getByText("No products being tracked")).toBeTruthy();
});
