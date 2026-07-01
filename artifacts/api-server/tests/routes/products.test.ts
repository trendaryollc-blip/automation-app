import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";

vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

import app from "../../src/app";
import { resetDb, seedTable } from "@workspace/db/test-utils";

describe("Products", () => {
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

  it("GET /products returns empty", async () => {
    const res = await authedRequest(app).get("/api/products");
    expect(res.body).toEqual([]);
  });

  it("GET /products returns seeded", async () => {
    seedTable("products", [
      {
        userId: 1,
        name: "Widget",
        status: "listed",
        costPrice: "5",
        sellPrice: "15",
      },
    ]);
    const res = await authedRequest(app).get("/api/products");
    expect(res.body[0].name).toBe("Widget");
    expect(res.body[0].margin).toBe(67);
  });

  it("POST /products creates", async () => {
    const res = await authedRequest(app)
      .post("/api/products")
      .send({ name: "New", costPrice: 10, sellPrice: 25 });
    expect(res.status).toBe(201);
  });

  it("GET /products/stock-alerts", async () => {
    seedTable("products", [
      {
        userId: 1,
        name: "Low",
        stockQuantity: 2,
        stockThreshold: 10,
        status: "listed",
      },
    ]);
    const res = await authedRequest(app).get("/api/products/stock-alerts");
    expect(res.body[0].name).toBe("Low");
  });

  it("GET /products/:id returns 404", async () => {
    const res = await authedRequest(app).get("/api/products/999");
    expect(res.status).toBe(404);
  });
});
