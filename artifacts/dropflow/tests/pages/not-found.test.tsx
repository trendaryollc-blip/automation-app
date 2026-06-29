import React from "react";
import { render, screen } from "@testing-library/react";

import NotFound from "../../src/pages/not-found";

test("renders 404 page content", () => {
  render(<NotFound />);
  expect(screen.getByText("404 Page Not Found")).toBeTruthy();
  expect(screen.getByText(/Did you forget to add the page to the router\?/)).toBeTruthy();
});
