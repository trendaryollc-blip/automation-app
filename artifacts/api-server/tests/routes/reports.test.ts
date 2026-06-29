import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import reportsRouter from "../../src/routes/reports";
import { resetDb, seedTable } from "@workspace/db";

const app = express().use(express.json()).use(reportsRouter);

describe("Reports", () => {
  beforeEach(() => resetDb());

  it("GET /reports/pl requires from/to", async () => {
    const res = await request(app).get("/reports/pl");
    expect(res.status).toBe(400);
  });

  it("GET /reports/pl returns P&L data", async () => {
    seedTable("orders", [{ status: "paid", sellPrice: "100", costPrice: "40" }]);
    const res = await request(app).get("/reports/pl?from=2020-01-01&to=2030-01-01");
    expect(res.status).toBe(200);
    expect(res.body.revenue).toBeGreaterThan(0);
  });
});