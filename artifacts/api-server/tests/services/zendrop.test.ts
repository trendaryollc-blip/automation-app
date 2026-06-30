import { test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  testZendrop,
  placeZendropOrder,
  getZendropInventory,
} from "../../src/services/zendrop";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("testZendrop returns error when config missing apiKey", async () => {
  const res = await testZendrop({ apiKey: undefined, baseUrl: undefined });
  expect(res.ok).toBe(false);
  expect(res.error).toMatch(/Zendrop API key is required/);
});

test("testZendrop returns ok when API responds with account info", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { email: "test@zendrop.com" } }),
    }),
  );

  const res = await testZendrop({
    apiKey: "valid-key",
    baseUrl: "https://api.example.com",
  });
  expect(res.ok).toBe(true);
  expect(res.message).toContain("Connected as");
});

test("testZendrop returns error when API response has no data", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    }),
  );

  const res = await testZendrop({
    apiKey: "invalid-key",
    baseUrl: "https://api.example.com",
  });
  expect(res.ok).toBe(false);
  expect(res.error).toContain("Invalid API key");
});

test("testZendrop handles fetch error gracefully", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("Network failure")),
  );

  const res = await testZendrop({
    apiKey: "key",
    baseUrl: "https://api.example.com",
  });
  expect(res.ok).toBe(false);
  expect(res.error).toContain("Zendrop connection failed");
});

test("placeZendropOrder throws when API key not configured", async () => {
  const originalKey = process.env.ZENDROP_API_KEY;
  delete process.env.ZENDROP_API_KEY;

  await expect(
    placeZendropOrder({
      productId: "p1",
      quantity: 1,
      shippingInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        phone: "123",
        address: "123 Main",
        city: "NYC",
        state: "NY",
        zip: "10001",
        country: "US",
      },
    }),
  ).rejects.toThrow("Zendrop API key not configured");

  if (originalKey) process.env.ZENDROP_API_KEY = originalKey;
});

test("placeZendropOrder makes a successful API call", async () => {
  process.env.ZENDROP_API_KEY = "test-key";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: "ord-123", status: "processing" }),
    }),
  );

  const result = await placeZendropOrder({
    productId: "p1",
    quantity: 2,
    shippingInfo: {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@test.com",
      phone: "456",
      address: "456 Oak",
      city: "LA",
      state: "CA",
      zip: "90001",
      country: "US",
    },
  });

  expect(result.orderId).toBe("ord-123");
  expect(fetch).toHaveBeenCalledTimes(1);

  delete process.env.ZENDROP_API_KEY;
});

test("placeZendropOrder throws on non-ok response", async () => {
  process.env.ZENDROP_API_KEY = "test-key";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    }),
  );

  await expect(
    placeZendropOrder({
      productId: "p1",
      quantity: 1,
      shippingInfo: {
        firstName: "J",
        lastName: "D",
        email: "j@t.com",
        phone: "1",
        address: "1 A",
        city: "C",
        state: "S",
        zip: "Z",
        country: "US",
      },
    }),
  ).rejects.toThrow("Zendrop order failed: 400");

  delete process.env.ZENDROP_API_KEY;
});

test("getZendropInventory throws when API key not configured", async () => {
  delete process.env.ZENDROP_API_KEY;

  await expect(getZendropInventory("p1")).rejects.toThrow(
    "Zendrop API key not configured",
  );
});

test("getZendropInventory returns product data", async () => {
  process.env.ZENDROP_API_KEY = "test-key";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "p1", stock: 100 } }),
    }),
  );

  const data = await getZendropInventory("p1");
  expect(data).toEqual({ id: "p1", stock: 100 });

  delete process.env.ZENDROP_API_KEY;
});

test("getZendropInventory throws on non-ok response", async () => {
  process.env.ZENDROP_API_KEY = "test-key";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }),
  );

  await expect(getZendropInventory("p1")).rejects.toThrow(
    "Zendrop inventory check failed: 404",
  );

  delete process.env.ZENDROP_API_KEY;
});
