import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";

import healthRouter from "../../src/routes/health";
import { resetDb, seedTable } from "@workspace/db/test-utils";

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
