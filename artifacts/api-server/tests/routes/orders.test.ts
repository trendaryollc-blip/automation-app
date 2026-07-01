import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";

vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

import ordersRouter from "../../src/routes/orders";
import { resetDb, seedTable } from "@workspace/db";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(ordersRouter);
  return app;
}

describe("Orders Route", () => {
  beforeEach(() => resetDb());

  describe("GET /orders", () => {
    it("returns empty array when no orders", async () => {
      const res = await authedRequest(createApp()).get("/orders");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns seeded orders", async () => {
      seedTable("orders", [{ userId: 1,
          orderNumber: "ORD-001",
          customerName: "Alice",
          status: "pending",
          sellPrice: "100",
          quantity: 1,
        },
      ]);
      const res = await authedRequest(createApp()).get("/orders");
      expect(res.body).toHaveLength(1);
      expect(res.body[0].customerName).toBe("Alice");
    });
  });

  describe("POST /orders", () => {
    it("creates an order with valid data", async () => {
      const res = await authedRequest(createApp()).post("/orders").send({
        productName: "Widget",
        customerName: "Bob",
        sellPrice: 50,
        costPrice: 20,
        quantity: 2,
      });
      expect(res.status).toBe(201);
      expect(res.body.customerName).toBe("Bob");
    });
  });

  describe("POST /orders/bulk-update", () => {
    it("updates multiple orders status", async () => {
      seedTable("orders", [{ userId: 1, id: 1, orderNumber: "O1", status: "pending" },
        { id: 2, orderNumber: "O2", status: "pending" },
      ]);
      const res = await authedRequest(createApp())
        .post("/orders/bulk-update")
        .send({ orderIds: [1, 2], status: "placed" });
      expect(res.body.updatedCount).toBe(2);
    });
  });

  describe("POST /orders/import", () => {
    it("imports orders from rows", async () => {
      const res = await authedRequest(createApp())
        .post("/orders/import")
        .send({ rows: [{ productName: "Imported" }] });
      expect(res.body.imported).toBe(1);
    });
  });

  describe("GET /orders/:id", () => {
    it("returns a specific order", async () => {
      const [o] = seedTable("orders", [{ userId: 1, orderNumber: "O3", customerName: "Charlie", status: "pending" },
      ]);
      const res = await authedRequest(createApp()).get(`/orders/${o.id}`);
      expect(res.status).toBe(200);
      expect(res.body.customerName).toBe("Charlie");
    });

    it("returns 404 for missing order", async () => {
      const res = await authedRequest(createApp()).get("/orders/999");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /orders/:id", () => {
    it("updates an order", async () => {
      const [o] = seedTable("orders", [{ userId: 1, orderNumber: "O4", customerName: "Dave", status: "pending" },
      ]);
      const res = await authedRequest(createApp())
        .patch(`/orders/${o.id}`)
        .send({ status: "shipped", trackingNumber: "TRACK123" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("shipped");
    });
  });

  describe("DELETE /orders/:id", () => {
    it("deletes an order", async () => {
      const [o] = seedTable("orders", [{ userId: 1, orderNumber: "O5", customerName: "Eve", status: "pending" },
      ]);
      const res = await authedRequest(createApp()).delete(`/orders/${o.id}`);
      expect(res.status).toBe(204);
    });
  });
});
