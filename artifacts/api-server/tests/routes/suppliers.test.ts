import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";
import suppliersRouter from "../../src/routes/suppliers";
import { resetDb, seedTable } from "@workspace/db";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

const app = express().use(express.json()).use(suppliersRouter);

describe("Suppliers", () => {
  beforeEach(() => resetDb());

  it("GET /suppliers returns empty", async () => {
    const res = await authedRequest(express().use(suppliersRouter)).get("/suppliers");
    expect(res.body).toEqual([]);
  });

  it("GET /suppliers filters by country", async () => {
    seedTable("suppliers", [{ userId: 1, name: "A", country: "China" },
      { name: "B", country: "USA" },
    ]);
    const res = await authedRequest(express().use(suppliersRouter)).get(
      "/suppliers?country=China",
    );
    expect(res.body).toHaveLength(1);
  });

  it("POST /suppliers creates", async () => {
    const res = await authedRequest(app)
      .post("/suppliers")
      .send({ name: "New Sup", country: "Germany" });
    expect(res.status).toBe(201);
  });

  it("GET /suppliers/:id returns 404", async () => {
    const res = await authedRequest(express().use(suppliersRouter)).get(
      "/suppliers/999",
    );
    expect(res.status).toBe(404);
  });
});
