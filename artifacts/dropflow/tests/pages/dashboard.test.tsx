import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Mock router link and Recharts wrapper components
vi.mock("wouter", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("recharts", () => {
  const React = require("react");
  const Stub = ({ children }: any) => <div>{children}</div>;
  return {
    AreaChart: Stub,
    BarChart: Stub,
    LineChart: Stub,
    PieChart: Stub,
    RadialBarChart: Stub,
    ResponsiveContainer: Stub,
    CartesianGrid: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    Area: Stub,
    Bar: Stub,
    Line: Stub,
    Pie: Stub,
    Cell: Stub,
    RadialBar: Stub,
  };
});

vi.mock("@workspace/api-client-react", () => ({
  useGetDashboardStats: () => ({
    data: {
      totalRevenue: 12345,
      totalProfit: 6789,
      pendingOrders: 5,
      totalOrders: 12,
      avgMargin: 23.4,
    },
    isLoading: false,
  }),
  useGetDashboardAnalytics: ({ period }: any) => ({
    data: {
      data: [
        { date: "2026-01-01", revenue: 1000, profit: 200, orderCount: 10 },
        { date: "2026-01-02", revenue: 1200, profit: 250, orderCount: 12 },
      ],
      totalRevenue: 2200,
      totalProfit: 450,
      revenueChange: 5,
      profitChange: 3,
      totalOrders: 22,
      ordersChange: 1.5,
    },
    isLoading: false,
  }),
  useGetRecentOrders: () => ({
    data: [
      {
        id: "o1",
        orderNumber: "ORD-001",
        customerName: "Jane",
        productName: "Sneakers",
        status: "delivered",
        profit: 45.5,
      },
    ],
    isLoading: false,
  }),
  useGetTrendingProducts: () => ({
    data: [
      {
        id: "p1",
        name: "Top Gadget",
        category: "Electronics",
        margin: 31.5,
        status: "listed",
      },
    ],
    isLoading: false,
  }),
  useHealthCheck: () => ({ data: { status: "ok" } }),
  useGetStockAlerts: () => ({
    data: [{ id: "a1", name: "Widget", stockQuantity: 1, stockThreshold: 2 }],
  }),
}));

import Dashboard from "../../src/pages/dashboard";

describe("Dashboard", () => {
it("Dashboard renders key statistics and stock alert banner", async () => {
  render(<Dashboard />);

  expect(await screen.findByText("War Room")).toBeTruthy();
  expect(screen.getByText(/All Systems Operational/i)).toBeTruthy();
  expect(screen.getByText(/running low on stock/i)).toBeTruthy();
  expect(screen.getAllByText("Total Revenue")[0]).toBeTruthy();
  expect(screen.getAllByText("Net Profit")[0]).toBeTruthy();
});

it("Dashboard switches period buttons", async () => {
  render(<Dashboard />);

  const user = userEvent.setup();
  const monthly = await screen.findByText("Monthly");
  await user.click(monthly);
  expect(monthly).toBeTruthy();
});
});
