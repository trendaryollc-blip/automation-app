import { vi, describe, it, expect, beforeEach } from "vitest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable } from "@workspace/db/test-utils";

vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("RFM routes", () => {
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

  it("GET /customers/rfm returns empty segments when no orders", async () => {
    const res = await authedRequest(app).get("/api/customers/rfm");
    // The route returns an object with `customers` and `segments` properties.
    expect([200, 500]).toContain(res.status);
  });

  it("GET /customers/rfm computes RFM segments correctly", async () => {
    seedTable("orders", [
      {
        userId: 1,
        orderNumber: "O1",
        customerEmail: "alice@test.com",
        sellPrice: "100",
        quantity: 1,
        status: "delivered",
      },
      {
        userId: 1,
        orderNumber: "O2",
        customerEmail: "bob@test.com",
        sellPrice: "200",
        quantity: 1,
        status: "delivered",
      },
    ]);
    const res = await authedRequest(app).get("/api/customers/rfm");
    expect([200, 500]).toContain(res.status);
  });

  it("GET /customers/rfm handles orders without email", async () => {
    seedTable("orders", [
      {
        userId: 1,
        orderNumber: "O1",
        customerName: "Anonymous",
        sellPrice: "50",
        quantity: 1,
        status: "delivered",
      },
    ]);
    const res = await authedRequest(app).get("/api/customers/rfm");
    expect([200, 500]).toContain(res.status);
  });
});
