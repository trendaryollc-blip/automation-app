import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@workspace/api-client-react", () => ({
  useListPriceWatches: () => ({
    data: [
      {
        id: 1,
        name: "Compete Widget",
        url: "https://example.com",
        myPrice: 9.99,
        latestPrice: 12.5,
        notes: "Fast ship",
        status: "researching",
        snapshotCount: 2,
        latestRecordedAt: "2026-01-01T12:00:00Z",
      },
    ],
    refetch: vi.fn(),
  }),
  useCreatePriceWatch: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  }),
  useDeletePriceWatch: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  }),
  useListPriceSnapshots: () => ({
    data: [
      { id: 1, recordedAt: "2026-01-01T12:00:00Z", price: 12.5, note: "" },
    ],
    refetch: vi.fn(),
  }),
  useAddPriceSnapshot: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

import PriceWatchPage from "../../src/pages/price-watch";

test("Price Watch renders tracked products summary", async () => {
  render(<PriceWatchPage />);

  expect(await screen.findByText("Price Watch")).toBeTruthy();
  expect(screen.getByText("Tracking")).toBeTruthy();
  expect(screen.getByText("You're cheaper")).toBeTruthy();
});

test("Price Watch displays add form when button clicked", async () => {
  render(<PriceWatchPage />);

  const user = userEvent.setup();
  const addButton = await screen.findByText("Add Product");
  await user.click(addButton);

  expect(await screen.findByText("Add Competitor Product")).toBeTruthy();
});
