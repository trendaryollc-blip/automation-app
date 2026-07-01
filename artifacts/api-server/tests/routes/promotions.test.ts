import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";
import promotionsRouter from "../../src/routes/promotions";
import { resetDb, seedTable, getTableData } from "@workspace/db";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

const app = express().use(express.json()).use(promotionsRouter);

describe("Promotions routes", () => {
  beforeEach(() => resetDb());

  it("GET /promotions returns empty array initially", async () => {
    const res = await authedRequest(app).get("/promotions");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /promotions creates a promotion", async () => {
    const res = await authedRequest(app)
      .post("/promotions")
      .send({ name: "Sale", discountPercent: 20 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Sale");
  });

  it("PATCH /promotions/:id updates a promotion", async () => {
    const [p] = seedTable("promotions", [{ userId: 1, id: 10, name: "Old", discountPercent: 10 },
    ]);
    const res = await authedRequest(app)
      .patch(`/promotions/${p.id}`)
      .send({ discountPercent: 25 });
    expect(res.status).toBe(200);
    expect(res.body.discountPercent).toBe(25);
  });

  it("PATCH /promotions/:id returns 404 for nonexistent", async () => {
    const res = await authedRequest(app)
      .patch("/promotions/9999")
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });

  it("DELETE /promotions/:id removes a promotion", async () => {
    seedTable("promotions", [{ userId: 1, id: 20, name: "Test" }]);
    const res = await authedRequest(app).delete("/promotions/20");
    expect(res.status).toBe(200);
    expect(getTableData("promotions").length).toBe(0);
  });
});
