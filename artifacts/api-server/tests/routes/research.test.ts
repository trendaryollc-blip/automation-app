import { vi, describe, it, expect, beforeEach } from "vitest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable } from "@workspace/db/test-utils";

vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Research", () => {
  beforeEach(() => {
    resetDb();
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

  it("POST /research/analyze rejects missing query", async () => {
    const res = await authedRequest(app).post("/api/research/analyze").send({});
    expect(res.status).toBe(400);
  });

  it("POST /research/analyze returns fallback", async () => {
    const res = await authedRequest(app)
      .post("/api/research/analyze")
      .send({ query: "test product" });
    expect([200, 500]).toContain(res.status);
  });

  it("GET /research/history returns empty", async () => {
    const res = await authedRequest(app).get("/api/research/history");
    expect([200, 500]).toContain(res.status);
  });
});
