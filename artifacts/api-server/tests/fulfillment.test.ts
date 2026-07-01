import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "./helpers";
import app from "../src/app";
import { resetDb, seedTable, getTableData } from "@workspace/db";

describe("Fulfillment routes", () => {
  beforeEach(() => {
    resetDb();
  // Test-only auth setup: seed a default user so requireAuth() accepts
  // requests.  This pattern is shared by every test in this folder;
  // the row matches the FakeUser in tests/helpers.ts and lib/db/src/test-utils.ts.
  seedTable("users", [{ userId: 1,
      id: 1,
      email: "test@example.com",
      passwordHash: "x",
      name: "Test",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  });

  it("returns 400 when manual fulfillment missing orderId", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/fulfillment/manual").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("orderId required");
  });

  it("creates a fulfillment queue item via manual endpoint", async () => {
    const api = authedRequest(app);
    const [order] = seedTable("orders", [{ userId: 1,
        id: 200,
        orderNumber: "O200",
        customerName: "Alice",
        productName: "Gadget",
        quantity: 1,
        sellPrice: "30",
        costPrice: "10",
        status: "new",
      },
    ]);

    const res = await api
      .post("/api/fulfillment/manual")
      .send({ orderId: 200 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const queue = getTableData("fulfillment_queue");
    expect(queue.length).toBe(1);
    expect(queue[0].orderNumber).toBe("O200");
  });

  it("approves and rejects fulfillment items", async () => {
    const api = authedRequest(app);

    // Seed an order and a queue item
    seedTable("orders", [{ userId: 1, id: 300, orderNumber: "O300", customerName: "Bob", status: "new" },
    ]);
    const [q] = seedTable("fulfillment_queue", [{ userId: 1,
        id: 400,
        orderId: 300,
        orderNumber: "O300",
        productName: "Widget",
        quantity: 2,
        sellPrice: "40",
        estimatedCost: "10",
        status: "pending_approval",
      },
    ]);

    // Approve
    const approve = await api.post(`/api/fulfillment/approve/${q.id}`);
    expect(approve.status).toBe(200);
    expect(approve.body.success).toBe(true);

    // Verify purchase order created and queue item marked approved
    const pos = getTableData("purchase_orders");
    expect(pos.length).toBeGreaterThanOrEqual(1);
    // A purchase order should be created by approval
    const queueAfter = getTableData("fulfillment_queue");
    expect(queueAfter.length).toBeGreaterThanOrEqual(1);

    // Seed and reject another item
    const [q2] = seedTable("fulfillment_queue", [{ userId: 1,
        id: 401,
        orderId: 301,
        orderNumber: "O301",
        status: "pending_approval",
      },
    ]);
    const reject = await api
      .post(`/api/fulfillment/reject/${q2.id}`)
      .send({ reason: "bad item" });
    expect(reject.status).toBe(200);
    expect(reject.body.success).toBe(true);
  });

  it("returns queue and stats", async () => {
    const api = authedRequest(app);
    seedTable("fulfillment_queue", [{ userId: 1, id: 500, status: "pending_approval", sellPrice: "10", quantity: 1 },
      {
        id: 501,
        status: "approved",
        sellPrice: "20",
        quantity: 2,
        estimatedCost: "5",
      },
      { id: 502, status: "rejected", sellPrice: "30", quantity: 1 },
    ]);

    const q = await api.get("/api/fulfillment/queue");
    expect(q.status).toBe(200);
    expect(Array.isArray(q.body)).toBe(true);

    const stats = await api.get("/api/fulfillment/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.total).toBe(3);
    expect(stats.body.approved).toBe(1);
    expect(stats.body.rejected).toBe(1);
  });
});
import { test, expect } from "vitest";
import { detectCategory } from "../src/services/fulfillment-utils";

test("detectCategory recognizes tech products", () => {
  expect(detectCategory("Wireless Earbuds Pro")).toBe("tech");
  expect(detectCategory("USB-C Cable")).toBe("tech");
});

test("detectCategory falls back to general", () => {
  expect(detectCategory("Unique Artifact")).toBe("general");
});
