import { describe, it, expect, beforeEach, vi } from "vitest";

describe("fulfillment-engine external placement", () => {
  beforeEach(async () => {
    vi.resetModules();
    const db = await import("@workspace/db");
    db.resetDb();
  });

  it("calls placeCJOrder when store connection is cjdropshipping", async () => {
    const { seedTable } = await import("@workspace/db");
    seedTable("store_connections", [
      {
        id: 1,
        storeName: "CJ Store",
        apiKey: "df_cj",
        platform: "cjdropshipping",
        status: "active",
      },
    ]);
    seedTable("orders", [
      {
        id: 10,
        orderNumber: "ORD-CJ",
        customerName: "Cust",
        status: "pending",
        sellPrice: "50",
        quantity: 1,
      },
    ]);

    const placeCJOrder = vi.fn().mockResolvedValue({ success: true });
    const {
      fulfillOrderExternal,
      setExternalServiceLoader,
      resetExternalServiceLoader,
    } = await import("../../src/routes/fulfillment");

    setExternalServiceLoader(async (serviceName) => {
      if (serviceName === "cjdropshipping") {
        return { placeCJOrder };
      }
      throw new Error(`Unexpected service: ${serviceName}`);
    });

    await fulfillOrderExternal(10, 1);
    resetExternalServiceLoader();
    expect(placeCJOrder).toHaveBeenCalled();
  });

  it("calls placeZendropOrder when store connection is zendrop", async () => {
    const { seedTable } = await import("@workspace/db");
    seedTable("store_connections", [
      {
        id: 2,
        storeName: "Zen Store",
        apiKey: "df_zen",
        platform: "zendrop",
        status: "active",
      },
    ]);
    seedTable("orders", [
      {
        id: 11,
        orderNumber: "ORD-ZEN",
        customerName: "Cust",
        status: "pending",
        sellPrice: "50",
        quantity: 1,
      },
    ]);

    const placeZendropOrder = vi.fn().mockResolvedValue({ success: true });
    const {
      fulfillOrderExternal,
      setExternalServiceLoader,
      resetExternalServiceLoader,
    } = await import("../../src/routes/fulfillment");

    setExternalServiceLoader(async (serviceName) => {
      if (serviceName === "zendrop") {
        return { placeZendropOrder };
      }
      throw new Error(`Unexpected service: ${serviceName}`);
    });

    await fulfillOrderExternal(11, 2);
    resetExternalServiceLoader();
    expect(placeZendropOrder).toHaveBeenCalled();
  });
});
