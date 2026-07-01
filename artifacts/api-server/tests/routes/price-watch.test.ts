import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable } from "@workspace/db/test-utils";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Price Watch", () => {
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

  it("GET /price-watch returns empty", async () => {
    const res = await authedRequest(app).get("/api/price-watch");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /price-watch creates", async () => {
    const res = await authedRequest(app)
      .post("/api/price-watch")
      .send({
        name: "Test Watch",
        url: "https://example.com/product",
        productId: 1,
        targetPrice: 20,
      });
    expect(res.status).toBe(201);
  });

  it("POST /price-watch rejects missing fields", async () => {
    const res = await authedRequest(app).post("/api/price-watch").send({});
    expect(res.status).toBe(400);
  });
});
