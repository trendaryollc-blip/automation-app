import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

// Mock external hooks and router used by Layout
vi.mock("@workspace/api-client-react", () => ({
  useGetStockAlerts: () => ({ data: [{ id: "a" }] }),
  useListPriceWatches: () => ({ data: [{ myPrice: 10, latestPrice: 5 }] }),
}));

vi.mock("@/pages/settings", () => ({
  loadSettings: () => ({ lowStockAlertsEnabled: true, priceAlertThresholdPct: 10 }),
}));

vi.mock("wouter", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useLocation: () => ["/", () => {}],
}));

import Layout from "../../src/components/layout";

test("renders navigation groups and notifications badge", async () => {
  render(
    <Layout>
      <div>page content</div>
    </Layout>,
  );

  // Title
  expect(screen.getByText("DropFlow")).toBeTruthy();

  // Dashboard link present
  expect(screen.getByText("Dashboard")).toBeTruthy();

  // Settings link present
  expect(screen.getByText("Settings")).toBeTruthy();

  // Notification badge should show combined alerts (1 stock + 1 price)
  expect(screen.getAllByText("2").length).toBeGreaterThan(0);
});
