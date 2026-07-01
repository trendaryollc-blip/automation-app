import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb } from "@workspace/db";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Product Scorer routes", () => {
  beforeEach(() => {
    resetDb();
  // Test-only auth setup: seed a default user so requireAuth() accepts
  // requests.  This pattern is shared by every test in this folder;
  // the row matches the FakeUser in tests/helpers.ts and lib/db/src/test-utils.ts.
  seedTable("users", [{ userId: 1,
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
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("name is required");
  });

  it("POST /products/score uses fallback when AI unavailable", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/products/score").send({
      name: "Wireless Bluetooth Earbuds",
      category: "tech",
      costPrice: 10,
      sellPrice: 30,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("viralityScore");
    expect(res.body.name).toBe("Wireless Bluetooth Earbuds");
    expect(res.body.aiPowered).toBe(false);
    expect(res.body.category).toBe("tech");
    expect(res.body.margin).toBe(67); // ((30-10)/30)*100 = 66.67 rounded
    expect(res.body.platformScores).toHaveProperty("tiktok");
    expect(res.body.platformScores).toHaveProperty("google");
    expect(res.body.verdict).toBeTruthy();
  });

  it("POST /products/score detects category from name", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/products/score").send({
      name: "Hydrating Face Serum with Vitamin C",
      sellPrice: 25,
      costPrice: 5,
    });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe("beauty");
    expect(res.body.aiPowered).toBe(false);
    expect(res.body.viralityScore).toBeGreaterThanOrEqual(10);
  });

  it("POST /products/score handles unknown category", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/products/score").send({
      name: "Abstract Widget Thingamajig",
    });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe("default");
    expect(res.body.aiPowered).toBe(false);
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
    expect(res1.body.viralityScore).toBe(res2.body.viralityScore);
    expect(res1.body.platformScores.tiktok).toBe(
      res2.body.platformScores.tiktok,
    );
  });
});
