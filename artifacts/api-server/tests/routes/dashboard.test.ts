import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";
import dashboardRouter from "../../src/routes/dashboard";
import { resetDb, seedTable } from "@workspace/db";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Dashboard", () => {
  beforeEach(() => resetDb());

  it("GET /dashboard/stats returns zeros", async () => {
    const res = await authedRequest(express().use(dashboardRouter)).get(
      "/dashboard/stats",
    );
    expect(res.body.totalProducts).toBe(0);
    expect(res.body.totalOrders).toBe(0);
  });

  it("GET /dashboard/analytics returns weekly data", async () => {
    const res = await authedRequest(express().use(dashboardRouter)).get(
      "/dashboard/analytics",
    );
    expect(res.body.data).toHaveLength(7);
  });

  it("GET /dashboard/analytics?period=monthly returns 12 months", async () => {
    const res = await authedRequest(express().use(dashboardRouter)).get(
      "/dashboard/analytics?period=monthly",
    );
    expect(res.body.data).toHaveLength(12);
  });
});
