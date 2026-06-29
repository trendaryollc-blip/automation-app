import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("recharts", () => {
  const React = require("react");
  const Stub = ({ children }: any) => <div>{children}</div>;
  return {
    AreaChart: Stub,
    BarChart: Stub,
    ResponsiveContainer: Stub,
    CartesianGrid: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    Area: Stub,
    Bar: Stub,
    Legend: Stub,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      summary: {
        netCashPosition: 5000,
        pendingRevenue: 1500,
        pendingCosts: 600,
        projectedNet30: 4200,
        totalRevenue: 18000,
        activeAdSpend: 400,
      },
      cashFlowTimeline: [
        { month: "Jan", inflow: 5000, outflow: 3200, net: 1800 },
        { month: "Feb", inflow: 5200, outflow: 3100, net: 2100 },
      ],
      platformBreakdown: {
        web: { spend: 1200, revenue: 8000 },
      },
    },
    isLoading: false,
  }),
}));

import CashFlowPage from "../../src/pages/cash-flow";

test("Cash Flow page renders summary cards and chart sections", async () => {
  render(<CashFlowPage />);

  expect(await screen.findByText("Cash Flow Forecast")).toBeTruthy();
  expect(screen.getByText("Net Cash Position")).toBeTruthy();
  expect(screen.getByText("Pending Inflows")).toBeTruthy();
  expect(screen.getByText("Total Revenue")).toBeTruthy();
});

test("Cash Flow page renders a monthly cash flow chart section", async () => {
  render(<CashFlowPage />);

  expect(await screen.findByText("6-Month Cash Flow")).toBeTruthy();
  expect(screen.getByText("Monthly Net Cash")).toBeTruthy();
});
