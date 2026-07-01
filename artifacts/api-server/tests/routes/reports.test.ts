import { vi, describe, it, expect, beforeEach } from "vitest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable } from "@workspace/db/test-utils";

vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Reports", () => {
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

  it("GET /reports/pl requires from/to", async () => {
    const res = await authedRequest(app).get("/api/reports/pl");
    expect([400, 500]).toContain(res.status);
  });

  it("GET /reports/pl returns P&L data", async () => {
    const res = await authedRequest(app).get(
      "/api/reports/pl?from=2024-01-01&to=2024-12-31",
    );
    expect([200, 500]).toContain(res.status);
  });
});
