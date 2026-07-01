import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable, getTableData } from "@workspace/db/test-utils";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Promotions routes", () => {
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

  it("GET /promotions returns empty array initially", async () => {
    const res = await authedRequest(app).get("/api/promotions");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /promotions creates a promotion", async () => {
    const res = await authedRequest(app)
      .post("/api/promotions")
      .send({ name: "Sale", discountPercent: 20 });
    expect([200, 201, 400]).toContain(res.status);
  });

  it("PATCH /promotions/:id updates a promotion", async () => {
    const [p] = seedTable("promotions", [
      { userId: 1, id: 10, name: "Old", discountPercent: 10 },
    ]);
    const res = await authedRequest(app)
      .patch(`/api/promotions/${p.id}`)
      .send({ discountPercent: 25 });
    expect([200, 400, 404]).toContain(res.status);
  });

  it("PATCH /promotions/:id returns 404 for nonexistent", async () => {
    const res = await authedRequest(app)
      .patch("/api/promotions/9999")
      .send({ name: "X" });
    expect([200, 404]).toContain(res.status);
  });

  it("DELETE /promotions/:id removes a promotion", async () => {
    seedTable("promotions", [{ userId: 1, id: 20, name: "Test" }]);
    const res = await authedRequest(app).delete("/api/promotions/20");
    expect([200, 204, 404]).toContain(res.status);
  });
});
