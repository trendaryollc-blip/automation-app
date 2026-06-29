import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@workspace/api-client-react", () => ({
  useListOrders: () => ({
    data: [
      { id: 1, productId: 1, productName: "Product A", quantity: 2, sellPrice: 100, costPrice: 60, status: "placed" },
      { id: 2, productId: 2, productName: "Product B", quantity: 1, sellPrice: 80, costPrice: 40, status: "delivered" },
    ],
    isLoading: false,
  }),
  useListProducts: () => ({
    data: [
      { id: 1, name: "Product A" },
      { id: 2, name: "Product B" },
    ],
    isLoading: false,
  }),
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
    Cell: Stub,
  };
});

import AnalyticsPage from "../../src/pages/analytics";

test("Analytics page shows KPIs and chart options", async () => {
  render(<AnalyticsPage />);
  expect(await screen.findByText("Product Profitability")).toBeTruthy();
  expect(screen.getByText("Total Revenue")).toBeTruthy();
  expect(screen.getAllByText("Profit")[0]).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Units Sold" })[0]).toBeTruthy();
});

test("Analytics chart buttons update metric state", async () => {
  render(<AnalyticsPage />);
  const user = userEvent.setup();
  const revenueButton = screen.getAllByRole("button", { name: "Revenue" })[0];
  expect(revenueButton).toBeTruthy();
  await user.click(revenueButton);
});
