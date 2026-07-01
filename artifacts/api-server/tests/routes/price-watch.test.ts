import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";
import priceWatchRouter from "../../src/routes/price-watch";
import { resetDb, seedTable } from "@workspace/db";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

const app = express().use(express.json()).use(priceWatchRouter);

describe("Price Watch", () => {
  beforeEach(() => resetDb());

  it("GET /price-watch returns empty", async () => {
    const res = await authedRequest(app).get("/price-watch");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /price-watch creates", async () => {
    const res = await authedRequest(app)
      .post("/price-watch")
      .send({ productId: 1, targetPrice: 20 });
    expect(res.status).toBe(201);
  });

  it("POST /price-watch rejects missing fields", async () => {
    const res = await authedRequest(app).post("/price-watch").send({});
    expect(res.status).toBe(400);
  });
});
