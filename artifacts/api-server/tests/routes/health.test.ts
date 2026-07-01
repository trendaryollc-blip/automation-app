import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
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
    // Test-only auth setup: seed a default user so requireAuth() accepts
    // requests.  This pattern is shared by every test in this folder;
    // the row matches the FakeUser in tests/helpers.ts and lib/db/src/test-utils.ts.
    seedTable("users", [
      {
        userId: 1,
        id: 1,
        email: "test@example.com",
        passwordHash: "x",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it("GET /healthz returns 200 with status ok", async () => {
    const app = createApp();
    const res = await authedRequest(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
