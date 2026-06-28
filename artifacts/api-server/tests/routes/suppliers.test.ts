import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import suppliersRouter from "../../src/routes/suppliers";
import { resetDb, seedTable } from "@workspace/db";

const app = express().use(express.json()).use(suppliersRouter);

describe("Suppliers", () => {
  beforeEach(() => resetDb());

  it("GET /suppliers returns empty", async () => {
    const res = await request(express().use(suppliersRouter)).get("/suppliers");
    expect(res.body).toEqual([]);
  });

  it("GET /suppliers filters by country", async () => {
    seedTable("suppliers", [
      { name: "A", country: "China" },
      { name: "B", country: "USA" },
    ]);
    const res = await request(express().use(suppliersRouter)).get(
      "/suppliers?country=China",
    );
    expect(res.body).toHaveLength(1);
  });

  it("POST /suppliers creates", async () => {
    const res = await request(app)
      .post("/suppliers")
      .send({ name: "New Sup", country: "Germany" });
    expect(res.status).toBe(201);
  });

  it("GET /suppliers/:id returns 404", async () => {
    const res = await request(express().use(suppliersRouter)).get(
      "/suppliers/999",
    );
    expect(res.status).toBe(404);
  });
});
