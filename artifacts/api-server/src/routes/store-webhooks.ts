/**
 * Public webhook receivers for connected stores.
 *
 * These endpoints authenticate via the `X-DropFlow-Key` header (the API
 * key generated for each store connection) rather than a user session.
 * Mounted BEFORE `requireAuth` in `routes/index.ts`.
 */
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db, storeConnectionsTable, ordersTable } from "@workspace/db";
import { autoFulfillOrder } from "../services/fulfillment-engine.js";

const router: IRouter = Router();

const OrderPayloadSchema = z.object({
  orderNumber: z.string().max(80).nullish(),
  customerName: z.string().max(200),
  customerEmail: z.string().email().max(254).nullish(),
  productName: z.string().max(200),
  quantity: z.number().int().positive().max(1000).default(1),
  sellPrice: z.number().nonnegative().nullish(),
  costPrice: z.number().nonnegative().nullish(),
  status: z.string().max(80).default("pending"),
  notes: z.string().max(2000).nullish(),
  shippingAddress: z.string().max(2000).nullish(),
});

const WebhookBodySchema = z.object({
  event: z.string().min(1).max(80),
  order: OrderPayloadSchema.optional(),
  product: z.unknown().optional(),
});

router.post("/webhooks/store", async (req, res): Promise<void> => {
  const apiKey = req.headers["x-dropflow-key"];
  if (!apiKey || typeof apiKey !== "string") {
    res.status(401).json({ error: "Missing X-DropFlow-Key header" });
    return;
  }

  // Look up the connection by API key (NOT user-scoped — the webhook is
  // an external system call). We still log activity for the owner.
  const [conn] = await db
    .select()
    .from(storeConnectionsTable)
    .where(eq(storeConnectionsTable.apiKey, apiKey))
    .limit(1);

  if (!conn) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }
  if (conn.status !== "active") {
    res.status(403).json({ error: "Store connection is disabled" });
    return;
  }

  const parsed = WebhookBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { event, order } = parsed.data;

  let logStatus = "success";
  let logError: string | null = null;

  try {
    if (event === "order.created" || event === "order.updated") {
      if (!order) throw new Error("order object required for order events");
      const orderNumber =
        order.orderNumber ??
        `${conn.storeName.toUpperCase().replace(/\s+/g, "").slice(0, 4)}-${Date.now().toString(16).toUpperCase()}`;
      const [inserted] = await db
        .insert(ordersTable)
        .values({
          userId: conn.userId,
          orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail ?? null,
          productName: order.productName,
          quantity: order.quantity ?? 1,
          sellPrice: order.sellPrice != null ? String(order.sellPrice) : "0",
          costPrice: order.costPrice != null ? String(order.costPrice) : null,
          status: order.status ?? "pending",
          shippingAddress: order.shippingAddress ?? null,
        })
        .returning();
      await db
        .update(storeConnectionsTable)
        .set({
          totalOrdersSynced: conn.totalOrdersSynced + 1,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(storeConnectionsTable.id, conn.id));

      // Fire-and-forget auto-fulfillment.
      if (inserted) {
        autoFulfillOrder({
          userId: conn.userId,
          id: inserted.id,
          orderNumber: inserted.orderNumber ?? orderNumber,
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
  } catch (err: unknown) {
    logStatus = "error";
    logError = err instanceof Error ? err.message : "Unknown error";
  }

  // Log the sync attempt regardless of success/failure. We import the table
  // here lazily to avoid loading it on every other route in the file.
  const { syncLogsTable } = await import("@workspace/db");
  await db.insert(syncLogsTable).values({
    storeConnectionId: conn.id,
    userId: conn.userId,
    event: event ?? "unknown",
    status: logStatus,
    payload: JSON.stringify(req.body).slice(0, 2000),
    error: logError,
  });

  if (logStatus === "error") {
    res.status(400).json({ error: logError });
    return;
  }
  res.json({ success: true, event });
});

export default router;
