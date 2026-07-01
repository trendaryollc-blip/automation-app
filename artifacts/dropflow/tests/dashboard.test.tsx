import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "../src/pages/dashboard";
import { renderWithProviders } from "./utils";

// Mock the @workspace/api-client-react hooks so the dashboard doesn't sit in
// the "Loading War Room..." state waiting for MSW/API responses.
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
  useGetDashboardAnalytics: () => ({
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
  useGetStockAlerts: () => ({ data: [] }),
}));

// Mock Recharts so the chart rendering doesn't blow up under jsdom.
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

describe("Dashboard page", () => {
  it("renders the dashboard heading and status", async () => {
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText(/War Room/i)).toBeInTheDocument();
    expect(await screen.findByText(/System Status/i)).toBeInTheDocument();
  });
});
