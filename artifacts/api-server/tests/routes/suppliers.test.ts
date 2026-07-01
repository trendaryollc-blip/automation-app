import { describe, it, expect, beforeEach } from "vitest";
import { setupAuthedUser } from "../helpers";
import { resetDb, seedTable } from "@workspace/db/test-utils";
import { requireAuth } from "../../src/middlewares/auth";
import suppliersRouter from "../../src/routes/suppliers";
import express from "express";

describe("Suppliers", () => {
  beforeEach(() => resetDb());

  it("GET /suppliers returns empty", async () => {
    const app = express()
      .use(express.json())
      .use(requireAuth)
      .use(suppliersRouter);
    const { api } = setupAuthedUser(app);
    const res = await api.get("/suppliers");
    expect(res.body).toEqual([]);
  });

  it("GET /suppliers filters by country", async () => {
    const app = express()
      .use(express.json())
      .use(requireAuth)
      .use(suppliersRouter);
    const { api } = setupAuthedUser(app);
    seedTable("suppliers", [
      { userId: 1, name: "A", country: "China" },
      { name: "B", country: "USA" },
    ]);
    const res = await api.get("/suppliers?country=China");
    expect(res.body).toHaveLength(1);
  });

  it("POST /suppliers creates", async () => {
    const app = express()
      .use(express.json())
      .use(requireAuth)
      .use(suppliersRouter);
    const { api } = setupAuthedUser(app);
    const res = await api.post("/suppliers").send({
      name: "New Sup",
      country: "Germany",
    });
    expect(res.status).toBe(201);
  });

  it("GET /suppliers/:id returns 404", async () => {
    const app = express()
      .use(express.json())
      .use(requireAuth)
      .use(suppliersRouter);
    const { api } = setupAuthedUser(app);
    const res = await api.get("/suppliers/999");
    expect(res.status).toBe(404);
  });
});
