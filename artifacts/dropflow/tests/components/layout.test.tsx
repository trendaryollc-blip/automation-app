import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the auth context so VerifyEmailBanner / UserMenu / AccountMenu
// (which all call useAuth) don't throw "must be used within <AuthProvider>".
vi.mock("../../src/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: 1, email: "test@example.com", emailVerified: true },
    loading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the menu components that depend on auth and router internals.
vi.mock("@/hooks/use-auth-actions.tsx", () => ({
  UserMenu: () => null,
}));
vi.mock("../../src/components/AccountMenu", () => ({
  AccountMenu: () => null,
}));

// Mock external hooks and router used by Layout
vi.mock("@workspace/api-client-react", () => ({
  useGetStockAlerts: () => ({ data: [{ id: "a" }] }),
  useListPriceWatches: () => ({ data: [{ myPrice: 10, latestPrice: 5 }] }),
}));

vi.mock("@/pages/settings", () => ({
  loadSettings: () => ({
    lowStockAlertsEnabled: true,
    priceAlertThresholdPct: 10,
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useLocation: () => ["/", () => {}],
}));

import Layout from "../../src/components/layout";

describe("Layout", () => {
it("renders navigation groups and notifications badge", async () => {
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
});
