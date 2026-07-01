import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";
import researchRouter from "../../src/routes/research";
import { resetDb, seedTable } from "@workspace/db/test-utils";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

const app = express().use(express.json()).use(researchRouter);

describe("Research", () => {
  beforeEach(() => resetDb());

  it("POST /research/analyze rejects missing query", async () => {
    const res = await authedRequest(app).post("/research/analyze").send({});
    expect(res.status).toBe(400);
  });

  it("POST /research/analyze returns fallback", async () => {
    const res = await authedRequest(app)
      .post("/research/analyze")
      .send({ query: "test product" });
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeTruthy();
  });

  it("GET /research/history returns empty", async () => {
    const res = await authedRequest(app).get("/research/history");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
