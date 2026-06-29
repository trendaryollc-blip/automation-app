import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@workspace/api-client-react", () => ({
  useListOrders: () => ({
    data: [
      {
        id: 1,
        orderNumber: "ORD-001",
        customerName: "Alice",
        customerEmail: "alice@example.com",
        productName: "Product A",
        quantity: 1,
        status: "placed",
        costPrice: 50,
        sellPrice: 120,
        profit: 70,
        supplierName: "Supplier X",
        trackingNumber: "TRACK123",
        createdAt: "2026-01-01T12:00:00Z",
      },
    ],
    isLoading: false,
  }),
  getListOrdersQueryKey: () => ["orders"],
  useCreateOrder: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
  useBulkUpdateOrders: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
  useGetCustomerInsights: () => ({ data: [{ customerName: "Alice", totalRevenue: 120, totalProfit: 70, avgOrderValue: 120, orderCount: 1 }], isLoading: false }),
}));

vi.mock("wouter", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("recharts", () => {
  const React = require("react");
  const Stub = ({ children }: any) => <div>{children}</div>;
  return {
    BarChart: Stub,
    ResponsiveContainer: Stub,
    CartesianGrid: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    Bar: Stub,
  };
});

import OrdersPage from "../../src/pages/orders";

test("Orders page renders order row and export button", async () => {
  render(<OrdersPage />);
  expect(await screen.findByText("ORD-001")).toBeTruthy();
  expect(screen.getByText("Export CSV")).toBeTruthy();
});

test("Orders page search input is present", async () => {
  render(<OrdersPage />);
  expect(await screen.findByPlaceholderText("Search orders, customers, products…")).toBeTruthy();
});
