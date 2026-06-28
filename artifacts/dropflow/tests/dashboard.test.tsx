import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Dashboard from "../src/pages/dashboard";
import { renderWithProviders } from "./utils";

describe("Dashboard page", () => {
  it("renders the dashboard heading and status", async () => {
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText(/War Room/i)).toBeInTheDocument();
    expect(screen.getByText(/System Status/i)).toBeInTheDocument();
  });
});
