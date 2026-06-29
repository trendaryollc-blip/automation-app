import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import promotionsRouter from "../../src/routes/promotions";
import { resetDb, seedTable, getTableData } from "@workspace/db";

const app = express().use(express.json()).use(promotionsRouter);

describe("Promotions routes", () => {
  beforeEach(() => resetDb());

  it("GET /promotions returns empty array initially", async () => {
    const res = await request(app).get("/promotions");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /promotions creates a promotion", async () => {
    const res = await request(app)
      .post("/promotions")
      .send({ name: "Sale", discountPercent: 20 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Sale");
  });

  it("PATCH /promotions/:id updates a promotion", async () => {
    const [p] = seedTable("promotions", [
      { id: 10, name: "Old", discountPercent: 10 },
    ]);
    const res = await request(app)
      .patch(`/promotions/${p.id}`)
      .send({ discountPercent: 25 });
    expect(res.status).toBe(200);
    expect(res.body.discountPercent).toBe(25);
  });

  it("PATCH /promotions/:id returns 404 for nonexistent", async () => {
    const res = await request(app).patch("/promotions/9999").send({ name: "X" });
    expect(res.status).toBe(404);
  });

  it("DELETE /promotions/:id removes a promotion", async () => {
    seedTable("promotions", [{ id: 20, name: "Test" }]);
    const res = await request(app).delete("/promotions/20");
    expect(res.status).toBe(200);
    expect(getTableData("promotions").length).toBe(0);
  });
});