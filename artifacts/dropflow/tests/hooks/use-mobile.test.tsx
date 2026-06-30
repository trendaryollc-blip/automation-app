import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

// Import the hook relative to the tests folder
import { useIsMobile } from "../../src/hooks/use-mobile";

function TestComp() {
  const isMobile = useIsMobile();
  return <div>{isMobile ? "mobile" : "desktop"}</div>;
}

beforeEach(() => {
  // simple matchMedia polyfill that exposes the last created mql as window.__lastMql
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const callbacks: Array<(e: any) => void> = [];
      const obj: any = {
        matches: window.innerWidth < 768,
        media: query,
        addEventListener: (ev: string, cb: (e: any) => void) =>
          callbacks.push(cb),
        removeEventListener: (ev: string, cb: (e: any) => void) => {
          for (let i = callbacks.length - 1; i >= 0; i--)
            if (callbacks[i] === cb) callbacks.splice(i, 1);
        },
        // helper for tests
        dispatchChange: () => {
          obj.matches = window.innerWidth < 768;
          callbacks.forEach((cb) => cb({ matches: obj.matches }));
        },
      };
      // expose for test control
      (window as any).__lastMql = obj;
      return obj;
    },
  });
});

afterEach(() => {
  // cleanup
  try {
    delete (window as any).__lastMql;
  } catch (e) {}
  // reset innerWidth
  window.innerWidth = 1024;
});

test("useIsMobile returns true when window is narrow and updates on change", async () => {
  window.innerWidth = 500;
  render(<TestComp />);
  // initial value should be mobile
  expect(screen.getByText("mobile")).toBeTruthy();

  // change to desktop width and trigger the media change
  window.innerWidth = 1200;
  const mql = (window as any).__lastMql;
  mql.dispatchChange();

  // hook should update to desktop
  expect(await screen.findByText("desktop")).toBeTruthy();
});
