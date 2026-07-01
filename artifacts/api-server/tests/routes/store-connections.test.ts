import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable, getTableData } from "@workspace/db/test-utils";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Store Connections routes", () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /store-connections returns empty array initially", async () => {
    const api = authedRequest(app);
    const res = await api.get("/api/store-connections");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /store-connections creates a store connection with apiKey", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/store-connections").send({
      storeName: "My Store",
      storeUrl: "https://mystore.com",
      platform: "shopify",
    });
    expect(res.status).toBe(201);
    expect(res.body.storeName).toBe("My Store");
    expect(res.body.apiKey).toMatch(/^df_/);
    expect(res.body.status).toBe("active");
    expect(res.body.platform).toBe("shopify");
  });

  it("POST /store-connections returns 400 when storeName missing", async () => {
    const api = authedRequest(app);
    const res = await api
      .post("/api/store-connections")
      .send({ platform: "custom" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("storeName is required");
  });

  it("PATCH /store-connections/:id updates a connection", async () => {
    const [conn] = seedTable("store_connections", [
      {
        userId: 1,
        id: 10,
        storeName: "Old Name",
        apiKey: "df_test",
        status: "active",
      },
    ]);

    const api = authedRequest(app);
    const res = await api.patch(`/api/store-connections/${conn.id}`).send({
      storeName: "New Name",
    });
    expect(res.status).toBe(200);
    expect(res.body.storeName).toBe("New Name");
  });

  it("PATCH /store-connections/:id returns 404 for nonexistent", async () => {
    const api = authedRequest(app);
    const res = await api
      .patch("/api/store-connections/9999")
      .send({ storeName: "X" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });

  it("DELETE /store-connections/:id removes a connection", async () => {
    seedTable("store_connections", [
      { userId: 1, id: 20, storeName: "To Delete", apiKey: "df_test" },
    ]);

    const api = authedRequest(app);
    const res = await api.delete("/api/store-connections/20");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getTableData("store_connections").length).toBe(0);
  });

  it("GET /store-connections/:id/logs returns logs", async () => {
    seedTable("store_connections", [
      { userId: 1, id: 30, storeName: "Logged", apiKey: "df_test" },
    ]);
    seedTable("sync_logs", [
      {
        userId: 1,
        id: 1,
        storeConnectionId: 30,
        event: "order.created",
        status: "success",
      },
      {
        id: 2,
        storeConnectionId: 30,
        event: "order.updated",
        status: "success",
      },
    ]);

    const api = authedRequest(app);
    const res = await api.get("/api/store-connections/30/logs");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("POST /store-connections/:id/regenerate-key generates a new API key", async () => {
    seedTable("store_connections", [
      {
        userId: 1,
        id: 40,
        storeName: "Key Store",
        apiKey: "df_oldkey",
        status: "active",
      },
    ]);

    const api = authedRequest(app);
    const res = await api.post("/api/store-connections/40/regenerate-key");
    expect(res.status).toBe(200);
    expect(res.body.apiKey).toMatch(/^df_/);
    expect(res.body.apiKey).not.toBe("df_oldkey");
  });

  it("POST /store-connections/:id/regenerate-key returns 404 for nonexistent", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/store-connections/999/regenerate-key");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });

  it("POST /store-connections/:id/test returns custom message for unknown platform", async () => {
    seedTable("store_connections", [
      {
        userId: 1,
        id: 50,
        storeName: "Custom",
        apiKey: "df_test",
        platform: "custom",
      },
    ]);

    const api = authedRequest(app);
    const res = await api.post("/api/store-connections/50/test");
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("Custom webhook test not implemented");
  });

  it("POST /store-connections/:id/test returns 404 for nonexistent", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/store-connections/999/test");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });

  it("POST /webhooks/store returns 401 with missing header", async () => {
    const api = authedRequest(app);
    const res = await api
      .post("/api/webhooks/store")
      .send({ event: "order.created" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing X-DropFlow-Key header");
  });

  it("POST /webhooks/store returns 401 with invalid key", async () => {
    const api = authedRequest(app);
    const res = await api
      .post("/api/webhooks/store")
      .set("x-dropflow-key", "invalid")
      .send({ event: "order.created" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid API key");
  });

  it("POST /webhooks/store returns 403 for inactive connection", async () => {
    seedTable("store_connections", [
      {
        userId: 1,
        id: 60,
        storeName: "Disabled Store",
        apiKey: "df_disabled",
        status: "disabled",
      },
    ]);

    const api = authedRequest(app);
    const res = await api
      .post("/api/webhooks/store")
      .set("x-dropflow-key", "df_disabled")
      .send({ event: "order.created" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Store connection is disabled");
  });

  it("POST /webhooks/store processes order.created event", async () => {
    seedTable("store_connections", [
      {
        userId: 1,
        id: 70,
        storeName: "ActiveStore",
        apiKey: "df_active",
        status: "active",
        totalOrdersSynced: 0,
      },
    ]);

    const api = authedRequest(app);
    const res = await api
      .post("/api/webhooks/store")
      .set("x-dropflow-key", "df_active")
      .send({
        event: "order.created",
        order: {
          orderNumber: "WEB-001",
          customerName: "John",
          productName: "Widget",
          quantity: 2,
          sellPrice: 30,
          costPrice: 10,
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const orders = getTableData("orders");
    expect(orders).toHaveLength(1);
    expect(orders[0].orderNumber).toBe("WEB-001");

    const logs = getTableData("sync_logs");
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("success");

    const updatedConn = getTableData("store_connections")[0];
    expect(updatedConn.totalOrdersSynced).toBe(1);
  });

  it("POST /webhooks/store returns error for unknown event type", async () => {
    seedTable("store_connections", [
      {
        userId: 1,
        id: 80,
        storeName: "Test",
        apiKey: "df_test2",
        status: "active",
      },
    ]);

    const api = authedRequest(app);
    const res = await api
      .post("/api/webhooks/store")
      .set("x-dropflow-key", "df_test2")
      .send({ event: "unknown.event" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Unknown event type");
  });
});
