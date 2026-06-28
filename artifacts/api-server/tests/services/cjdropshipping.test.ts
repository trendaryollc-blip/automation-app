import { describe, it, expect } from "vitest";
import {
  testCJDropshipping,
  placeCJOrder,
  getCJInventory,
} from "../../src/services/cjdropshipping";

describe("cjdropshipping", () => {
  describe("testCJDropshipping", () => {
    it("returns error when config is missing keys", async () => {
      const res = await testCJDropshipping({
        apiKey: undefined,
        apiSecret: undefined,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/API key and secret are required/);
    });

    it("returns error when config is null", async () => {
      const res = await testCJDropshipping(null);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/API key and secret are required/);
    });

    it("returns ok when API responds with account info", async () => {
      const fakeResponse = {
        ok: true,
        json: async () => ({ data: { email: "test@example.com" } }),
      };
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => fakeResponse as any;

      const res = await testCJDropshipping({
        apiKey: "k",
        apiSecret: "s",
        baseUrl: "https://api.example.com",
      });
      expect(res.ok).toBe(true);
      expect(res.message).toContain("Connected as");

      globalThis.fetch = originalFetch;
    });

    it("handles fetch errors gracefully", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new Error("Network error");
      };

      const res = await testCJDropshipping({ apiKey: "k", apiSecret: "s" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("CJ Dropshipping connection failed");

      globalThis.fetch = originalFetch;
    });
  });

  describe("placeCJOrder", () => {
    it("throws when credentials not configured", async () => {
      const originalKey = process.env.CJ_API_KEY;
      delete process.env.CJ_API_KEY;
      delete process.env.CJ_API_SECRET;

      await expect(
        placeCJOrder({
          productId: "123",
          quantity: 1,
          shippingInfo: {
            firstName: "A",
            lastName: "B",
            email: "a@b.com",
            phone: "123",
            address: "Addr",
            city: "City",
            state: "ST",
            zip: "123",
            country: "US",
          },
        }),
      ).rejects.toThrow("CJ Dropshipping API credentials not configured");

      if (originalKey) process.env.CJ_API_KEY = originalKey;
    });
  });

  describe("getCJInventory", () => {
    it("throws when credentials not configured", async () => {
      const originalKey = process.env.CJ_API_KEY;
      delete process.env.CJ_API_KEY;
      delete process.env.CJ_API_SECRET;

      await expect(getCJInventory("123")).rejects.toThrow(
        "CJ Dropshipping API credentials not configured",
      );

      if (originalKey) process.env.CJ_API_KEY = originalKey;
    });
  });
});
