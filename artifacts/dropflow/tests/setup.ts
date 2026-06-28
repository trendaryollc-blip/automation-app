import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

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
