import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@workspace/api-client-react", () => ({
  useListOrders: () => ({
    data: [
      {
        id: 1,
        orderNumber: "ORD-001",
        customerName: "Alice",
        customerEmail: "alice@example.com",
        productName: "Widget",
        quantity: 2,
        sellPrice: 120,
        costPrice: 80,
        profit: 40,
        status: "delivered",
        createdAt: "2026-06-01T12:00:00Z",
      },
      {
        id: 2,
        orderNumber: "ORD-002",
        customerName: "Bob",
        customerEmail: "bob@example.com",
        productName: "Gadget",
        quantity: 1,
        sellPrice: 80,
        costPrice: 50,
        profit: 30,
        status: "placed",
        createdAt: "2026-06-03T09:00:00Z",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      customers: [
        {
          name: "Alice",
          email: "alice@example.com",
          r: 5,
          f: 4,
          m: 4,
          rfmScore: 13,
          segment: "Champions",
          daysSinceLast: 10,
          orderCount: 3,
          totalSpend: 240,
          avgOrderValue: 80,
        },
      ],
      segments: { Champions: 1 },
      totalCustomers: 1,
      avgSpend: 240,
    },
    isLoading: false,
  }),
}));

import CustomersPage from "../../src/pages/customers";

test("Customers page renders list and summary cards", async () => {
  render(<CustomersPage />);

  expect(await screen.findByText("Customers")).toBeTruthy();
  expect(screen.getByText("Total Customers")).toBeTruthy();
  expect(screen.getByText("Total Revenue")).toBeTruthy();
  expect(screen.getByText("VIP Customers")).toBeTruthy();
  expect(screen.getByText("Alice")).toBeTruthy();
  expect(screen.getByText("alice@example.com")).toBeTruthy();
});

test("Customers page can switch to RFM view and show segment cards", async () => {
  render(<CustomersPage />);

  const user = userEvent.setup();
  const rfmButton = await screen.findByRole("button", {
    name: /RFM Segments/i,
  });
  await user.click(rfmButton);

  const championsBadges = await screen.findAllByText(/Champions/i);
  expect(championsBadges.length).toBeGreaterThan(0);
  expect(screen.queryByText(/No customers in this segment/i)).toBeNull();
});
