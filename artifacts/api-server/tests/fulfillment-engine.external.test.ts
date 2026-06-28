import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTable, getTableData } from "@workspace/db";

// Mock external providers before importing the module under test
vi.mock("../src/services/cjdropshipping.js", () => ({
  placeCJOrder: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("../src/services/zendrop.js", () => ({
  placeZendropOrder: vi.fn().mockResolvedValue({ ok: true }),
}));

import * as fulfillment from "../src/services/fulfillment-engine";

describe("fulfillment-engine external placement", () => {
  beforeEach(() => {
    resetDb();
  });

  it("calls placeCJOrder when store connection is cjdropshipping", async () => {
    const { placeCJOrder } = await import("../src/services/cjdropshipping.js");

    seedTable("orders", [
      {
        id: 1000,
        orderNumber: "O1000",
        customerName: "CJ Buyer",
        status: "new",
      },
    ]);

    const [q] = seedTable("fulfillment_queue", [
      {
        id: 1100,
        orderId: 1000,
        orderNumber: "O1000",
        customerName: "CJ Buyer",
        productName: "CJProduct",
        quantity: 1,
        sellPrice: "50",
        estimatedCost: "10",
        status: "pending_approval",
        storeSource: "CJSTORE",
      },
    ]);

    seedTable("store_connections", [
      {
        id: 900,
        storeName: "CJSTORE",
        platform: "cjdropshipping",
        config: JSON.stringify({ apiKey: "k", apiSecret: "s" }),
      },
    ]);

    const res = await fulfillment.approveFulfillmentItem(q.id);
    expect(res.success).toBe(true);

    expect(placeCJOrder).toHaveBeenCalled();
    const pos = getTableData("purchase_orders");
    expect(pos.length).toBeGreaterThan(0);
  });

  it("calls placeZendropOrder when store connection is zendrop", async () => {
    const { placeZendropOrder } = await import("../src/services/zendrop.js");

    seedTable("orders", [
      {
        id: 2000,
        orderNumber: "O2000",
        customerName: "Z Buyer",
        status: "new",
      },
    ]);

    const [q] = seedTable("fulfillment_queue", [
      {
        id: 2100,
        orderId: 2000,
        orderNumber: "O2000",
        customerName: "Z Buyer",
        productName: "ZProduct",
        quantity: 2,
        sellPrice: "60",
        estimatedCost: "15",
        status: "pending_approval",
        storeSource: "ZSTORE",
      },
    ]);

    seedTable("store_connections", [
      {
        id: 901,
        storeName: "ZSTORE",
        platform: "zendrop",
        config: JSON.stringify({ apiKey: "k" }),
      },
    ]);

    const res = await fulfillment.approveFulfillmentItem(q.id);
    expect(res.success).toBe(true);

    expect(placeZendropOrder).toHaveBeenCalled();
    const pos = getTableData("purchase_orders");
    expect(pos.length).toBeGreaterThan(0);
  });
});
