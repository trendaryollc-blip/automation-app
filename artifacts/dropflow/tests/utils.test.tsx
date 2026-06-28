import { describe, expect, it } from "vitest";
import { renderWithProviders } from "./utils";
import { screen } from "@testing-library/react";

describe("renderWithProviders", () => {
  it("renders children inside the query client provider", () => {
    renderWithProviders(<div>provider works</div>);

    expect(screen.getByText("provider works")).toBeInTheDocument();
  });
});
