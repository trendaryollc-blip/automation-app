import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

import healthRouter from "../../src/routes/health";
import { resetDb } from "@workspace/db";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(healthRouter);
  return app;
}

describe("Health Route", () => {
  beforeEach(() => {
    resetDb();
  });

  it("GET /healthz returns 200 with status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
