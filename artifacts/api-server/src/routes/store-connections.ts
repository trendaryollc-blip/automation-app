import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { storeConnectionsTable, syncLogsTable, ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { autoFulfillOrder } from "../services/fulfillment-engine.js";
import { testCJDropshipping } from "../services/cjdropshipping.js";
import { testZendrop } from "../services/zendrop.js";

const router: IRouter = Router();

function generateApiKey(): string {
  return "df_" + crypto.randomBytes(24).toString("hex");
}

router.get("/store-connections", async (_req, res) => {
  const connections = await db.select().from(storeConnectionsTable).orderBy(desc(storeConnectionsTable.createdAt));
  res.json(connections);
});

router.post("/store-connections", async (req, res) => {
  const { storeName, storeUrl, platform, notes, config } = req.body as {
    storeName?: string; storeUrl?: string; platform?: string; notes?: string; config?: Record<string, unknown> | null;
  };
  if (!storeName) { res.status(400).json({ error: "storeName is required" }); return; }
  const apiKey = generateApiKey();
  const [conn] = await db.insert(storeConnectionsTable).values({
    storeName,
    storeUrl: storeUrl ?? null,
    platform: platform ?? "custom",
    apiKey,
    notes: notes ?? null,
    status: "active",
    config: config ? JSON.stringify(config) : null,
  }).returning();
  res.status(201).json({ ...conn, config: conn.config ? JSON.parse(conn.config) : null });
});

router.patch("/store-connections/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { config, ...rest } = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (config !== undefined) {
    updateData.config = config ? JSON.stringify(config) : null;
  }
  const [updated] = await db.update(storeConnectionsTable)
    .set(updateData)
    .where(eq(storeConnectionsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, config: updated.config ? JSON.parse(updated.config) : null });
});

router.delete("/store-connections/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(storeConnectionsTable).where(eq(storeConnectionsTable.id, id));
  res.json({ success: true });
});

router.get("/store-connections/:id/logs", async (req, res) => {
  const id = parseInt(req.params.id);
  const logs = await db.select().from(syncLogsTable)
    .where(eq(syncLogsTable.storeConnectionId, id))
    .orderBy(desc(syncLogsTable.createdAt))
    .limit(50);
  res.json(logs);
});

router.post("/store-connections/:id/regenerate-key", async (req, res) => {
  const id = parseInt(req.params.id);
  const newKey = generateApiKey();
  const [updated] = await db.update(storeConnectionsTable)
    .set({ apiKey: newKey, updatedAt: new Date() })
    .where(eq(storeConnectionsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.post("/store-connections/:id/test", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conn] = await db.select().from(storeConnectionsTable).where(eq(storeConnectionsTable.id, id));
  if (!conn) { res.status(404).json({ error: "Not found" }); return; }

  try {
    const config = conn.config ? JSON.parse(conn.config) as Record<string, unknown> : null;
    const platform = conn.platform;

    if (platform === "cjdropshipping") {
      const result = await testCJDropshipping(config);
      res.json(result);
      return;
    }
    if (platform === "zendrop") {
      const result = await testZendrop(config);
      res.json(result);
      return;
    }

    res.json({ ok: true, message: "Custom webhook test not implemented" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ ok: false, error: msg });
  }
});

router.post("/webhooks/store", async (req, res) => {
  const apiKey = req.headers["x-dropflow-key"] as string | undefined;
  if (!apiKey) { res.status(401).json({ error: "Missing X-DropFlow-Key header" }); return; }

  const [conn] = await db.select().from(storeConnectionsTable).where(eq(storeConnectionsTable.apiKey, apiKey));
  if (!conn) { res.status(401).json({ error: "Invalid API key" }); return; }
  if (conn.status !== "active") { res.status(403).json({ error: "Store connection is disabled" }); return; }

  const { event, order, product } = req.body as {
    event?: string;
    order?: {
      orderNumber?: string; customerName?: string; customerEmail?: string;
      productName?: string; quantity?: number; sellPrice?: number;
      costPrice?: number; status?: string; notes?: string;
      shippingAddress?: string;
    };
    product?: {
      name?: string; category?: string; sellPrice?: number;
      costPrice?: number; description?: string; imageUrl?: string;
      sourceUrl?: string; stockQuantity?: number;
    };
  };

  let logStatus = "success";
  let logError: string | null = null;

  try {
    if (event === "order.created" || event === "order.updated") {
      if (!order) throw new Error("order object required for order events");
      const count = await db.select().from(ordersTable);
      const autoNumber = order.orderNumber ?? `${conn.storeName.toUpperCase().replace(/\s+/g, "").slice(0, 4)}-${String(count.length + 1).padStart(4, "0")}`;
      await db.insert(ordersTable).values({
        orderNumber: autoNumber,
        customerName: order.customerName ?? "Unknown",
        customerEmail: order.customerEmail ?? null,
        productName: order.productName ?? "Unknown Product",
        quantity: order.quantity ?? 1,
        sellPrice: order.sellPrice?.toString() ?? "0",
        costPrice: order.costPrice?.toString() ?? null,
        status: order.status ?? "pending",
        shippingAddress: order.shippingAddress ?? null,
      });
      await db.update(storeConnectionsTable)
        .set({ totalOrdersSynced: conn.totalOrdersSynced + 1, lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(storeConnectionsTable.id, conn.id));

      // Trigger auto-fulfillment engine (non-blocking)
      const [inserted] = await db.select().from(ordersTable)
        .where(eq(ordersTable.orderNumber, autoNumber));
      if (inserted) {
        autoFulfillOrder({
          id: inserted.id,
          orderNumber: inserted.orderNumber ?? autoNumber,
          customerName: inserted.customerName ?? "Unknown",
          productName: inserted.productName ?? "Unknown Product",
          quantity: inserted.quantity ?? 1,
          sellPrice: inserted.sellPrice ?? null,
          storeSource: conn.storeName ?? "unknown",
        }).catch(() => {});
      }
    } else {
      throw new Error(`Unknown event type: ${event}`);
    }
  } catch (err: any) {
    logStatus = "error";
    logError = err?.message ?? "Unknown error";
  }

  await db.insert(syncLogsTable).values({
    storeConnectionId: conn.id,
    event: event ?? "unknown",
    status: logStatus,
    payload: JSON.stringify(req.body).slice(0, 2000),
    error: logError,
  });

  if (logStatus === "error") {
    res.status(400).json({ error: logError });
  } else {
    res.json({ success: true, event });
  }
});

export default router;
