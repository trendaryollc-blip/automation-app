import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { resetDb, seedTable } from "@workspace/db";

describe("RFM routes", () => {
  beforeEach(() => {
    resetDb();
  });

  it("GET /customers/rfm returns empty segments when no orders", async () => {
    const api = request(app);
    const res = await api.get("/api/customers/rfm");
    expect(res.status).toBe(200);
    expect(res.body.customers).toEqual([]);
    expect(res.body.segments).toEqual({});
  });

  it("GET /customers/rfm computes RFM segments correctly", async () => {
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

    seedTable("orders", [
      // Champion customer: recent, frequent, high spend
      {
        id: 1,
        customerName: "Alice",
        customerEmail: "alice@test.com",
        status: "paid",
        sellPrice: "100",
        costPrice: "40",
        quantity: 3,
        createdAt: daysAgo(2),
      },
      {
        id: 2,
        customerName: "Alice",
        customerEmail: "alice@test.com",
        status: "paid",
        sellPrice: "200",
        quantity: 1,
        createdAt: daysAgo(5),
      },
      // At Risk customer: old orders, high value
      {
        id: 3,
        customerName: "Bob",
        customerEmail: "bob@test.com",
        status: "paid",
        sellPrice: "150",
        quantity: 2,
        createdAt: daysAgo(180),
      },
      {
        id: 4,
        customerName: "Bob",
        customerEmail: "bob@test.com",
        status: "paid",
        sellPrice: "80",
        quantity: 1,
        createdAt: daysAgo(200),
      },
      // Lost customer: very old, low frequency
      {
        id: 5,
        customerName: "Charlie",
        customerEmail: "charlie@test.com",
        status: "paid",
        sellPrice: "20",
        quantity: 1,
        createdAt: daysAgo(365),
      },
      // Cancelled order should be excluded
      {
        id: 6,
        customerName: "Alice",
        customerEmail: "alice@test.com",
        status: "cancelled",
        sellPrice: "50",
        quantity: 1,
        createdAt: daysAgo(1),
      },
    ]);

    const api = request(app);
    const res = await api.get("/api/customers/rfm");
    expect(res.status).toBe(200);
    expect(res.body.customers).toHaveLength(3);
    expect(res.body.totalCustomers).toBe(3);

    // Alice should have the highest RFM score
    const alice = res.body.customers.find((c: any) => c.name === "Alice");
    expect(alice).toBeDefined();
    expect(alice.orderCount).toBe(2); // cancelled excluded
    expect(alice.totalSpend).toBe(500); // (100*3) + (200*1) = 500

    // Verify segments exist
    expect(Object.keys(res.body.segments).length).toBeGreaterThan(0);
    expect(res.body.avgSpend).toBeGreaterThan(0);
  });

  it("GET /customers/rfm handles orders without email", async () => {
    seedTable("orders", [
      {
        id: 10,
        customerName: "No Email",
        status: "paid",
        sellPrice: "50",
        quantity: 1,
        createdAt: new Date(),
      },
    ]);

    const api = request(app);
    const res = await api.get("/api/customers/rfm");
    expect(res.status).toBe(200);
    expect(res.body.customers).toHaveLength(1);
  });
});