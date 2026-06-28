import { test, expect } from "@playwright/test";

test("api health endpoint returns ok", async ({ request }) => {
  const resp = await request.get("http://127.0.0.1:8080/api/healthz");
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(body).toHaveProperty("status", "ok");
});
