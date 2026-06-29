import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Polyfill ResizeObserver for jsdom used by some UI libs
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = ResizeObserverMock;

// Polyfill minimal localStorage for the test environment
if (typeof (global as any).localStorage === "undefined" || typeof (global as any).localStorage.getItem !== "function") {
  (global as any).localStorage = (() => {
    let _store: Record<string, string> = {};
    return {
      getItem(key: string) {
        return _store[key] ?? null;
      },
      setItem(key: string, value: string) {
        _store[key] = String(value);
      },
      removeItem(key: string) {
        delete _store[key];
      },
      clear() {
        _store = {};
      },
    };
  })();
}

// Polyfill URL blob helpers for export tests
if (typeof (global as any).URL === "undefined" || typeof (global as any).URL.createObjectURL !== "function") {
  (global as any).URL = {
    createObjectURL: () => "blob:fake",
    revokeObjectURL: () => {},
  };
}

afterEach(() => {
  cleanup();
});

const server = setupServer(
  http.get("/api/healthz", () => {
    return HttpResponse.json({ status: "ok" });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
