import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

// We'll import the module after resetting modules so the module-level memory is fresh per test
async function importToastModule() {
  vi.resetModules();
  return await import("../../src/hooks/use-toast");
}

function ToastViewer() {
  const { toasts } = (require("../../src/hooks/use-toast") as any).useToast();
  return <div data-testid="out">{JSON.stringify(toasts)}</div>;
}

test("toast can add, update and dismiss toasts", async () => {
  const mod = await importToastModule();
  const { useToast, toast } = mod as any;

  function Comp() {
    const state = useToast();
    return <div data-testid="out">{JSON.stringify(state.toasts)}</div>;
  }

  render(<Comp />);

  // create a toast
  const t = toast({ title: "hello" });

  // wait for the toast to appear in the viewer
  expect(await screen.findByText(/hello/)).toBeTruthy();

  // update the toast
  t.update({ title: "updated" });
  expect(await screen.findByText(/updated/)).toBeTruthy();

  // dismiss the toast
  t.dismiss();
  // dismissal sets open: false on the toast object
  expect(await screen.findByText(/"open"\s*:\s*false/)).toBeTruthy();
});
