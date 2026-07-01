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

describe("Order Timeline routes", () => {
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

  it("GET /orders/:id/timeline returns empty for unknown order", async () => {
    const api = authedRequest(app);
    const res = await api.get("/api/orders/1/timeline");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /orders/:id/timeline creates a timeline event", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/orders/5/timeline").send({
      status: "shipped",
      note: "Package dispatched",
    });
    expect(res.status).toBe(201);
    expect(res.body.orderId).toBe(5);
    expect(res.body.note).toBe("Package dispatched");

    const events = getTableData("order_timeline");
    expect(events.length).toBe(1);
  });

  it("GET /orders/:id/timeline returns events for an order", async () => {
    seedTable("order_timeline", [
      {
        userId: 1,
        id: 1,
        orderId: 3,
        status: "confirmed",
        note: "Order confirmed",
      },
      { id: 2, orderId: 3, status: "shipped", note: "Shipped out" },
    ]);

    const api = authedRequest(app);
    const res = await api.get("/api/orders/3/timeline");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].status).toBe("confirmed");
  });
});
