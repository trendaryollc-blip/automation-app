import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import dashboardRouter from "../../src/routes/dashboard";
import { resetDb, seedTable } from "@workspace/db";

describe("Dashboard", () => {
  beforeEach(() => resetDb());

  it("GET /dashboard/stats returns zeros", async () => {
    const res = await request(express().use(dashboardRouter)).get(
      "/dashboard/stats",
    );
    expect(res.body.totalProducts).toBe(0);
    expect(res.body.totalOrders).toBe(0);
  });

  it("GET /dashboard/analytics returns weekly data", async () => {
    const res = await request(express().use(dashboardRouter)).get(
      "/dashboard/analytics",
    );
    expect(res.body.data).toHaveLength(7);
  });

  it("GET /dashboard/analytics?period=monthly returns 12 months", async () => {
    const res = await request(express().use(dashboardRouter)).get(
      "/dashboard/analytics?period=monthly",
    );
    expect(res.body.data).toHaveLength(12);
  });
});
