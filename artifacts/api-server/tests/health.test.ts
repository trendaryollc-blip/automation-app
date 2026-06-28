import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import healthRouter from "../src/routes/health";

describe("health endpoint", () => {
  it("returns ok status", async () => {
    const app = express();
    app.use(healthRouter);

    const res = await request(app).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
