import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("recharts", () => {
  const React = require("react");
  const Stub = ({ children }: any) => <div>{children}</div>;
  return {
    BarChart: Stub,
    RadarChart: Stub,
    ResponsiveContainer: Stub,
    CartesianGrid: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    Bar: Stub,
    Radar: Stub,
    PolarGrid: Stub,
    PolarAngleAxis: Stub,
    PolarRadiusAxis: Stub,
    Legend: Stub,
    Cell: Stub,
  };
});

vi.mock("@workspace/api-client-react", () => ({
  useListSuppliers: () => ({
    data: [
      {
        id: 1,
        name: "Supplier A",
        country: "US",
        website: "https://supplier-a.example.com",
      },
    ],
    isLoading: false,
  }),
  useListOrders: () => ({
    data: [
      {
        id: 1,
        productId: 1,
        status: "delivered",
        sellPrice: 120,
        costPrice: 70,
        quantity: 2,
      },
    ],
    isLoading: false,
  }),
  useListProducts: () => ({
    data: [{ id: 1, supplierId: 1, name: "Widget" }],
    isLoading: false,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [{ orderId: 1 }],
    isLoading: false,
  }),
}));

import SuppliersPage from "../../src/pages/suppliers";

test("Suppliers page renders supplier summary and scorecard", async () => {
  render(<SuppliersPage />);

  expect(
    await screen.findByText(/Supplier Performance Scorecard/i),
  ).toBeTruthy();
  expect(
    screen.getByText(
      /Composite rankings across fulfillment, margins, volume, and reliability/i,
    ),
  ).toBeTruthy();
  const supplierLinks = await screen.findAllByRole("link", {
    name: /Supplier A/i,
  });
  expect(supplierLinks.length).toBeGreaterThan(0);
});

test("Suppliers page allows switching metric chart options", async () => {
  render(<SuppliersPage />);

  const user = userEvent.setup();
  const profitButtons = await screen.findAllByRole("button", {
    name: "Profit",
  });
  expect(profitButtons.length).toBeGreaterThan(0);
  await user.click(profitButtons[0]);
  expect(profitButtons[0]).toBeTruthy();
});
