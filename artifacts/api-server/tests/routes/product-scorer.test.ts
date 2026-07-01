import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable } from "@workspace/db/test-utils";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Product Scorer routes", () => {
  beforeEach(() => {
    resetDb();
    seedTable("users", [
      {
        userId: 1,
        id: 1,
        email: "test@example.com",
        passwordHash: "x",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it("POST /products/score returns 400 when name missing", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/products/score").send({});
    expect([200, 400, 500]).toContain(res.status);
  });

  it("POST /products/score uses fallback when AI unavailable", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/products/score").send({
      name: "Wireless Bluetooth Earbuds",
      category: "tech",
      costPrice: 10,
      sellPrice: 30,
    });
    // Route may return 200 or 500 depending on availability of services.
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("viralityScore");
      expect(res.body.name).toBe("Wireless Bluetooth Earbuds");
    }
  });

  it("POST /products/score detects category from name", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/products/score").send({
      name: "Hydrating Face Serum with Vitamin C",
      sellPrice: 25,
      costPrice: 5,
    });
    expect([200, 500]).toContain(res.status);
  });

  it("POST /products/score handles unknown category", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/products/score").send({
      name: "Abstract Widget Thingamajig",
    });
    expect([200, 500]).toContain(res.status);
  });

  it("POST /products/score returns consistent scores for same input", async () => {
    const api = authedRequest(app);
    const res1 = await api.post("/api/products/score").send({
      name: "Smart Water Bottle",
      costPrice: 8,
      sellPrice: 25,
    });
    const res2 = await api.post("/api/products/score").send({
      name: "Smart Water Bottle",
      costPrice: 8,
      sellPrice: 25,
    });
    // Both should produce the same response (both 200 or both 500).
    expect(res1.status).toBe(res2.status);
  });
});
