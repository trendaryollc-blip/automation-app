import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import customerInsightsRouter from "../../src/routes/customer-insights";
import { resetDb, seedTable } from "@workspace/db";

const app = express().use(express.json()).use(customerInsightsRouter);

describe("Customer Insights", () => {
  beforeEach(() => resetDb());

  it("GET /orders/customer-insights returns aggregated data", async () => {
    seedTable("orders", [
      { customerName: "A", status: "paid", sellPrice: "100" },
      { customerName: "B", status: "paid", sellPrice: "200" },
    ]);
    const res = await request(app).get("/orders/customer-insights");
    expect(res.status).toBe(200);
    expect(res.body.totalCustomers).toBeGreaterThan(0);
  });
});
