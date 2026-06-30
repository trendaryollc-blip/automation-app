import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { resetDb, seedTable, getTableData } from "@workspace/db";

describe("Purchase Orders routes", () => {
  beforeEach(() => {
    resetDb();
  });

  it("GET /purchase-orders returns empty array initially", async () => {
    const api = request(app);
    const res = await api.get("/api/purchase-orders");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /purchase-orders creates a PO with items", async () => {
    const api = request(app);
    const res = await api.post("/api/purchase-orders").send({
      supplierName: "Supplier A",
      items: [
        { productName: "Item 1", quantity: 2, unitCost: 10 },
        { productName: "Item 2", quantity: 1, unitCost: 25 },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.poNumber).toMatch(/^PO-\d{4}$/);
    expect(res.body.totalCost).toBe(45);

    const items = getTableData("purchase_order_items");
    expect(items).toHaveLength(2);
  });

  it("POST /purchase-orders creates a PO without items", async () => {
    const api = request(app);
    const res = await api.post("/api/purchase-orders").send({
      supplierName: "No Items",
    });
    expect(res.status).toBe(201);
    expect(res.body.poNumber).toMatch(/^PO-\d{4}$/);
    expect(getTableData("purchase_order_items").length).toBe(0);
  });

  it("GET /purchase-orders/:id returns PO with items", async () => {
    const [po] = seedTable("purchase_orders", [
      { id: 100, poNumber: "PO-0001", supplierName: "Test Supplier" },
    ]);
    seedTable("purchase_order_items", [
      { id: 1, purchaseOrderId: 100, productName: "Widget", quantity: 5 },
    ]);

    const api = request(app);
    const res = await api.get("/api/purchase-orders/100");
    expect(res.status).toBe(200);
    expect(res.body.supplierName).toBe("Test Supplier");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productName).toBe("Widget");
  });

  it("GET /purchase-orders/:id returns 404 for nonexistent", async () => {
    const api = request(app);
    const res = await api.get("/api/purchase-orders/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });

  it("PATCH /purchase-orders/:id updates status and records timestamps", async () => {
    seedTable("purchase_orders", [
      { id: 200, poNumber: "PO-0002", status: "draft" },
    ]);

    const api = request(app);
    const res = await api.patch("/api/purchase-orders/200").send({
      status: "sent",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("sent");
    expect(res.body.sentAt).toBeTruthy();
  });

  it("PATCH /purchase-orders/:id returns 404 for nonexistent", async () => {
    const api = request(app);
    const res = await api
      .patch("/api/purchase-orders/999")
      .send({ status: "sent" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });

  it("DELETE /purchase-orders/:id removes PO and its items", async () => {
    seedTable("purchase_orders", [{ id: 300, poNumber: "PO-0003" }]);
    seedTable("purchase_order_items", [
      { id: 1, purchaseOrderId: 300, productName: "Item" },
    ]);

    const api = request(app);
    const res = await api.delete("/api/purchase-orders/300");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getTableData("purchase_orders").length).toBe(0);
    expect(getTableData("purchase_order_items").length).toBe(0);
  });
});
