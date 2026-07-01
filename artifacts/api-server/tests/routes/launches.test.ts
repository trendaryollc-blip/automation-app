import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable, getTableData } from "@workspace/db";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Launches routes", () => {
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

  it("GET /launches returns empty array initially", async () => {
    const api = authedRequest(app);
    const res = await api.get("/api/launches");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /launches creates a launch with default steps", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/launches").send({
      productName: "Test Product",
      targetLaunchDate: "2026-07-15",
      notes: "Test notes",
    });
    expect(res.status).toBe(201);
    expect(res.body.productName).toBe("Test Product");
    expect(res.body.steps).toHaveLength(7);
    expect(res.body.status).toBe("planning");
  });

  it("POST /launches returns 400 when productName missing", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/launches").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("productName is required");
  });

  it("PATCH /launches/:id updates a launch", async () => {
    const [launch] = seedTable("launches", [
      {
        userId: 1,
        id: 10,
        productName: "Old Name",
        status: "planning",
        steps: [],
      },
    ]);

    const api = authedRequest(app);
    const res = await api.patch(`/api/launches/${launch.id}`).send({
      productName: "Updated Name",
    });
    expect(res.status).toBe(200);
    expect(res.body.productName).toBe("Updated Name");
  });

  it("PATCH /launches/:id returns 404 for nonexistent", async () => {
    const api = authedRequest(app);
    const res = await api
      .patch("/api/launches/9999")
      .send({ productName: "X" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });

  it("DELETE /launches/:id removes a launch", async () => {
    seedTable("launches", [
      { userId: 1, id: 20, productName: "To Delete", steps: [] },
    ]);

    const api = authedRequest(app);
    const res = await api.delete("/api/launches/20");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getTableData("launches").length).toBe(0);
  });
});
