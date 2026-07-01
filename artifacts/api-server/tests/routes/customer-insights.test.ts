import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";
import customerInsightsRouter from "../../src/routes/customer-insights";
import { resetDb, seedTable } from "@workspace/db/test-utils";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

const app = express().use(express.json()).use(customerInsightsRouter);

describe("Customer Insights", () => {
  beforeEach(() => resetDb());

  it("GET /orders/customer-insights returns aggregated data", async () => {
    seedTable("orders", [
      { userId: 1, customerName: "A", status: "paid", sellPrice: "100" },
      { customerName: "B", status: "paid", sellPrice: "200" },
    ]);
    const res = await authedRequest(app).get("/orders/customer-insights");
    expect(res.status).toBe(200);
    expect(res.body.totalCustomers).toBeGreaterThan(0);
  });
});
