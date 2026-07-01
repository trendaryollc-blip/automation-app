import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";

vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

import productsRouter from "../../src/routes/products";
import { resetDb, seedTable } from "@workspace/db";

const app = express().use(express.json()).use(productsRouter);

describe("Products", () => {
  beforeEach(() => resetDb());

  it("GET /products returns empty", async () => {
    const res = await authedRequest(app).get("/products");
    expect(res.body).toEqual([]);
  });

  it("GET /products returns seeded", async () => {
    seedTable("products", [{ userId: 1, name: "Widget", status: "listed", costPrice: "5", sellPrice: "15" },
    ]);
    const res = await authedRequest(express().use(productsRouter)).get("/products");
    expect(res.body[0].name).toBe("Widget");
    expect(res.body[0].margin).toBe(67);
  });

  it("POST /products creates", async () => {
    const res = await authedRequest(app)
      .post("/products")
      .send({ name: "New", costPrice: 10, sellPrice: 25 });
    expect(res.status).toBe(201);
  });

  it("GET /products/stock-alerts", async () => {
    seedTable("products", [{ userId: 1, name: "Low", stockQuantity: 2, stockThreshold: 10, status: "listed" },
    ]);
    const res = await authedRequest(express().use(productsRouter)).get(
      "/products/stock-alerts",
    );
    expect(res.body[0].name).toBe("Low");
  });

  it("GET /products/:id returns 404", async () => {
    const res = await authedRequest(express().use(productsRouter)).get(
      "/products/999",
    );
    expect(res.status).toBe(404);
  });
});
