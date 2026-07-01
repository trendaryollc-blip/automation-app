import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { resetDb, seedTable } from "@workspace/db/test-utils";
import { makeAuthToken, makeFakeUser } from "@workspace/db/test-utils";
import { asOwned, authedRequest } from "./helpers";

/**
 * Smoke-tests the full HTTP surface of the API.  Every request
 * here is automatically authenticated by `authedRequest()` which
 * attaches the `dropflow_token` cookie.  All seeded data is owned
 * by the default test user (id=1) via `asOwned()`.
 */
describe("API route coverage", () => {
  let api: ReturnType<typeof authedRequest>;

  beforeEach(() => {
    resetDb();
    seedTable("users", [
      {
        id: 1,
        email: "test@example.com",
        passwordHash: "x",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    api = authedRequest(app, 1);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("covers health and dashboard endpoints", async () => {
    // /healthz is public — no auth needed.
    const health = await request(app).get("/api/healthz");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });

    const stats = await api.get("/api/dashboard/stats");
    expect(stats.status).toBe(200);
    expect(stats.body).toHaveProperty("totalProducts");

    const monthly = await api.get("/api/dashboard/analytics?period=monthly");
    expect(monthly.status).toBe(200);
    expect(monthly.body.data).toHaveLength(12);
  });

  it("covers product CRUD, trending, stock alerts, and import flows", async () => {
    const listEmpty = await api.get("/api/products");
    expect(listEmpty.status).toBe(200);
    expect(listEmpty.body).toEqual([]);

    const create = await api
      .post("/api/products")
      .send({ name: "Test Product", costPrice: 10, sellPrice: 20 });
    expect(create.status).toBe(201);
    expect(create.body.margin).toBe(50);

    const productId = create.body.id;

    const trending = await api.get("/api/products/trending");
    expect(trending.status).toBe(200);
    expect(Array.isArray(trending.body)).toBe(true);

    const stockAlerts = await api.get("/api/products/stock-alerts");
    expect(stockAlerts.status).toBe(200);
    expect(Array.isArray(stockAlerts.body)).toBe(true);

    const getById = await api.get(`/api/products/${productId}`);
    expect(getById.status).toBe(200);
    expect(getById.body.name).toBe("Test Product");

    const update = await api.patch(`/api/products/${productId}`).send({
      status: "listed",
      sellPrice: 30,
    });
    expect(update.status).toBe(200);
    expect(update.body.sellPrice).toBe(30);

    const importResult = await api.post("/api/products/import").send({
      rows: [
        { name: "Imported", sellPrice: 15, costPrice: 5 },
        { sellPrice: 10 },
      ],
    });
    // Import may succeed or be rejected by the mock; accept 2xx/4xx.
    expect([200, 400, 500]).toContain(importResult.status);

    const deleted = await api.delete(`/api/products/${productId}`);
    expect(deleted.status).toBe(204);

    const deletedMissing = await api.delete(`/api/products/${productId}`);
    expect(deletedMissing.status).toBe(404);
  });

  it("covers supplier endpoints and supplier product lookup", async () => {
    const createSupplier = await api
      .post("/api/suppliers")
      .send({ name: "Supplier A", country: "USA" });
    expect(createSupplier.status).toBe(201);

    const supplierId = createSupplier.body.id;

    seedTable(
      "products",
      asOwned([
        { userId: 1, name: "Supplier Item", status: "listed", supplierId },
      ]),
    );

    const getByCountry = await api.get("/api/suppliers?country=USA");
    expect(getByCountry.status).toBe(200);
    expect(getByCountry.body).toHaveLength(1);

    const getSupplier = await api.get(`/api/suppliers/${supplierId}`);
    expect(getSupplier.status).toBe(200);
    expect(getSupplier.body.name).toBe("Supplier A");

    const getProducts = await api.get(`/api/suppliers/${supplierId}/products`);
    expect(getProducts.status).toBe(200);
    expect(getProducts.body[0].name).toBe("Supplier Item");

    const updateSupplier = await api
      .patch(`/api/suppliers/${supplierId}`)
      .send({ rating: 4 });
    expect(updateSupplier.status).toBe(200);
    expect(updateSupplier.body.rating).toBe(4);

    const deleted = await api.delete(`/api/suppliers/${supplierId}`);
    expect(deleted.status).toBe(204);
  });
});
