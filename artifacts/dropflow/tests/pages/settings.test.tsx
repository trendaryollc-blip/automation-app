import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

import SettingsPage from "../../src/pages/settings";

beforeEach(() => {
  try { localStorage.removeItem("dropflow:settings"); } catch {}
  toastMock.mockClear();
});

test("save settings persists to localStorage and shows toast", async () => {
  render(<SettingsPage />);

  const user = userEvent.setup();
  const btn = await screen.findByText("Save Settings");
  await user.click(btn);

  const raw = localStorage.getItem("dropflow:settings");
  expect(raw).toBeTruthy();
  expect(toastMock).toHaveBeenCalled();
});
