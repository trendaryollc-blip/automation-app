import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { resetDb, seedTable } from "@workspace/db";

describe("API route coverage", () => {
  beforeEach(() => {
    resetDb();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("covers health and dashboard endpoints", async () => {
    const api = request(app);

    const health = await api.get("/api/healthz");
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
    const api = request(app);

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
    expect(importResult.status).toBe(200);
    expect(importResult.body.imported).toBe(1);
    expect(importResult.body.errors.length).toBe(1);

    const deleted = await api.delete(`/api/products/${productId}`);
    expect(deleted.status).toBe(204);

    const deletedMissing = await api.delete(`/api/products/${productId}`);
    expect(deletedMissing.status).toBe(404);
  });

  it("covers supplier endpoints and supplier product lookup", async () => {
    const api = request(app);

    const createSupplier = await api
      .post("/api/suppliers")
      .send({ name: "Supplier A", country: "USA" });
    expect(createSupplier.status).toBe(201);

    const supplierId = createSupplier.body.id;

    seedTable("products", [
      {
        name: "Supplier Item",
        status: "listed",
        supplierId,
      },
    ]);

    const getByCountry = await api.get("/api/suppliers?country=USA");
    expect(getByCountry.status).toBe(200);
    expect(getByCountry.body).toHaveLength(1);

    const getSupplier = await api.get(`/api/suppliers/${supplierId}`);
    expect(getSupplier.status).toBe(200);
    expect(getSupplier.body.name).toBe("Supplier A");

    const getProducts = await api.get(`/api/suppliers/${supplierId}/products`);
    expect(getProducts.status).toBe(200);
    expect(getProducts.body[0].name).toBe("Supplier Item");

    const updateSupplier = await api.patch(`/api/suppliers/${supplierId}`).send({
      rating: 4,
    });
    expect(updateSupplier.status).toBe(200);
    expect(updateSupplier.body.rating).toBe(4);

    const deleted = await api.delete(`/api/suppliers/${supplierId}`);
    expect(deleted.status).toBe(204);
  });

  it("covers orders import, bulk update, retrieval, update, and delete", async () => {
    const api = request(app);

    const createOrder = await api.post("/api/orders").send({
      productName: "Order Item",
      customerName: "Bob",
      costPrice: 10,
      sellPrice: 15,
      quantity: 2,
    });
    expect(createOrder.status).toBe(201);
    expect(createOrder.body.profit).toBe(10);

    const orderId = createOrder.body.id;

    const listOrders = await api.get("/api/orders");
    expect(listOrders.status).toBe(200);
    expect(listOrders.body.length).toBeGreaterThanOrEqual(1);

    const importOrders = await api.post("/api/orders/import").send({
      rows: [
        { productName: "Imported Order", quantity: 3, sellPrice: 10 },
        { quantity: 1 },
      ],
    });
    expect(importOrders.status).toBe(200);
    expect(importOrders.body.imported).toBe(1);
    expect(importOrders.body.errors.length).toBe(1);

    seedTable("orders", [
      {
        id: 100,
        orderNumber: "BULK1",
        status: "pending",
        productId: 10,
        quantity: 1,
      },
    ]);
    seedTable("products", [{ id: 10, name: "Bulk Product", stockQuantity: 5 }]);

    const bulkUpdate = await api.post("/api/orders/bulk-update").send({
      orderIds: [100],
      status: "delivered",
    });
    expect(bulkUpdate.status).toBe(200);
    expect(bulkUpdate.body.updatedCount).toBe(1);

    const getOrder = await api.get(`/api/orders/${orderId}`);
    expect(getOrder.status).toBe(200);
    expect(getOrder.body.customerName).toBe("Bob");

    const patchOrder = await api.patch(`/api/orders/${orderId}`).send({
      status: "shipped",
      trackingNumber: "TRK-1",
    });
    expect(patchOrder.status).toBe(200);
    expect(patchOrder.body.status).toBe("shipped");

    const deleteOrder = await api.delete(`/api/orders/${orderId}`);
    expect(deleteOrder.status).toBe(204);
  });

  it("covers price watch endpoints, snapshots, and invalid id handling", async () => {
    const api = request(app);

    const createWatch = await api
      .post("/api/price-watch")
      .send({ name: "Watch", url: "https://example.com" });
    expect(createWatch.status).toBe(201);

    const watchId = createWatch.body.id;

    const getSnapshotsEmpty = await api.get(`/api/price-watch/${watchId}/snapshots`);
    expect(getSnapshotsEmpty.status).toBe(200);
    expect(getSnapshotsEmpty.body).toEqual([]);

    const createSnapshot = await api
      .post(`/api/price-watch/${watchId}/snapshots`)
      .send({ price: 99 });
    expect(createSnapshot.status).toBe(201);
    expect(createSnapshot.body.price).toBe(99);

    const getSnapshots = await api.get(`/api/price-watch/${watchId}/snapshots`);
    expect(getSnapshots.status).toBe(200);
    expect(getSnapshots.body.length).toBe(1);

    const invalidDelete = await api.delete("/api/price-watch/not-a-number");
    expect(invalidDelete.status).toBe(400);
  });

  it("covers reports invalid dates and groupBy branches", async () => {
    const api = request(app);

    const invalidDate = await api.get(
      "/api/reports/pl?from=2025-01-01&to=not-a-date",
    );
    expect(invalidDate.status).toBe(400);

    seedTable("orders", [
      {
        orderNumber: "R1",
        productName: "Widget",
        status: "pending",
        supplierName: "Supplier A",
        sellPrice: "20",
        costPrice: "10",
        quantity: 1,
        createdAt: "2025-01-01",
      },
    ]);

    const reportSupplier = await api.get(
      "/api/reports/pl?from=2024-01-01&to=2026-01-01&groupBy=supplier",
    );
    expect(reportSupplier.status).toBe(200);
    expect(reportSupplier.body.groupBy).toBe("supplier");

    const reportStatus = await api.get(
      "/api/reports/pl?from=2024-01-01&to=2026-01-01&groupBy=status",
    );
    expect(reportStatus.status).toBe(200);
    expect(reportStatus.body.groupBy).toBe("status");
  });

  it("covers research analyze fallback and history", async () => {
    const api = request(app);

    const analyze = await api
      .post("/api/research/analyze")
      .send({ query: "wireless earbuds" });
    expect(analyze.status).toBe(200);
    expect(analyze.body).toHaveProperty("demandScore");

    const history = await api.get("/api/research/history");
    expect(history.status).toBe(200);
    expect(history.body.length).toBeGreaterThanOrEqual(1);
    expect(history.body[0].query).toBe("wireless earbuds");
  });

  it("covers ad campaigns and cash flow forecasting", async () => {
    const api = request(app);

    seedTable("ad_campaigns", [
      {
        platform: "facebook",
        status: "active",
        spend: 10,
        revenue: 20,
        impressions: 100,
        clicks: 5,
        conversions: 1,
      },
    ]);
    seedTable("orders", [
      {
        status: "paid",
        sellPrice: 20,
        costPrice: 10,
        quantity: 2,
        createdAt: "2024-01-01",
      },
      {
        status: "cancelled",
        sellPrice: 50,
        costPrice: 20,
        quantity: 1,
        createdAt: "2024-02-01",
      },
    ]);
    seedTable("purchase_orders", [
      {
        status: "sent",
        totalCost: 5,
        createdAt: "2024-01-01",
      },
      {
        status: "received",
        totalCost: 50,
        createdAt: "2024-03-01",
      },
    ]);

    const list = await api.get("/api/ad-campaigns");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    const createCampaign = await api.post("/api/ad-campaigns").send({
      platform: "google",
      status: "active",
      spend: 8,
      revenue: 15,
    });
    expect(createCampaign.status).toBe(201);

    const updateCampaign = await api
      .patch(`/api/ad-campaigns/${createCampaign.body.id}`)
      .send({ status: "paused" });
    expect(updateCampaign.status).toBe(200);
    expect(updateCampaign.body.status).toBe("paused");

    const stats = await api.get("/api/ad-campaigns/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.totalSpend).toBe(18);
    expect(stats.body.activeCampaigns).toBe(1);

    const forecast = await api.get("/api/cash-flow/forecast");
    expect(forecast.status).toBe(200);
    expect(forecast.body.summary.totalRevenue).toBe(40);
    expect(forecast.body.cashFlowTimeline).toHaveLength(6);
    expect(forecast.body.platformBreakdown).toHaveProperty("facebook");

    const removed = await api.delete(`/api/ad-campaigns/${createCampaign.body.id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.success).toBe(true);
  });

  it("covers ai settings provider management and test flows", async () => {
    const api = request(app);

    const providers = await api.get("/api/ai-settings/providers");
    expect(providers.status).toBe(200);
    expect(providers.body[0].id).toBe("groq");

    const saved = await api.put("/api/ai-settings/groq").send({
      apiKey: "secret-key",
      model: "llama-test",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.provider).toBe("groq");
    expect(saved.body.maskedKey).toContain("secret");

    const list = await api.get("/api/ai-settings");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(""),
      }),
    );

    const tested = await api.post("/api/ai-settings/test/groq");
    expect(tested.status).toBe(200);
    expect(tested.body.ok).toBe(true);

    const deleted = await api.delete("/api/ai-settings/groq");
    expect(deleted.status).toBe(204);
  });
});
