import { Router, type IRouter } from "express";
import { db, fulfillmentQueueTable, ordersTable, suppliersTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { autoFulfillOrder, approveFulfillmentItem, rejectFulfillmentItem } from "../services/fulfillment-engine.js";

const router: IRouter = Router();

router.get("/fulfillment/queue", async (_req, res) => {
  const items = await db.select().from(fulfillmentQueueTable).orderBy(desc(fulfillmentQueueTable.createdAt));
  res.json(items.map((i) => ({
    ...i,
    sellPrice: i.sellPrice ? Number(i.sellPrice) : null,
    estimatedCost: i.estimatedCost ? Number(i.estimatedCost) : null,
    estimatedMargin: i.estimatedMargin ? Number(i.estimatedMargin) : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    approvedAt: i.approvedAt?.toISOString() ?? null,
    rejectedAt: i.rejectedAt?.toISOString() ?? null,
  })));
});

router.get("/fulfillment/stats", async (_req, res) => {
  const all = await db.select().from(fulfillmentQueueTable);
  const pending = all.filter((i) => i.status === "pending_approval").length;
  const approved = all.filter((i) => i.status === "approved").length;
  const rejected = all.filter((i) => i.status === "rejected").length;
  const totalRevenue = all.filter(i => i.status === "approved" && i.sellPrice).reduce((s, i) => s + Number(i.sellPrice) * i.quantity, 0);
  const totalCost = all.filter(i => i.status === "approved" && i.estimatedCost).reduce((s, i) => s + Number(i.estimatedCost) * i.quantity, 0);
  res.json({ pending, approved, rejected, total: all.length, totalRevenue, totalCost });
});

router.post("/fulfillment/approve/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const result = await approveFulfillmentItem(id);
  if (!result.success) { res.status(400).json(result); return; }
  res.json(result);
});

router.post("/fulfillment/reject/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { reason } = req.body as { reason?: string };
  const result = await rejectFulfillmentItem(id, reason);
  if (!result.success) { res.status(400).json(result); return; }
  res.json(result);
});

router.post("/fulfillment/approve-all", async (_req, res) => {
  const pending = await db.select().from(fulfillmentQueueTable)
    .where(eq(fulfillmentQueueTable.status, "pending_approval"));
  const results = await Promise.all(pending.map((i) => approveFulfillmentItem(i.id)));
  const succeeded = results.filter((r) => r.success).length;
  res.json({ approved: succeeded, failed: results.length - succeeded });
});

router.post("/fulfillment/manual", async (req, res) => {
  const { orderId } = req.body as { orderId?: number };
  if (!orderId) { res.status(400).json({ error: "orderId required" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const existing = await db.select().from(fulfillmentQueueTable)
    .where(and(eq(fulfillmentQueueTable.orderId, orderId), eq(fulfillmentQueueTable.status, "pending_approval")));
  if (existing.length > 0) { res.status(409).json({ error: "Order already in fulfillment queue" }); return; }

  await autoFulfillOrder({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    productName: order.productName ?? "Unknown Product",
    quantity: order.quantity,
    sellPrice: order.sellPrice ?? null,
    storeSource: "manual",
  });

  res.json({ success: true });
});

router.get("/fulfillment/suppliers", async (_req, res) => {
  const suppliers = await db.select().from(suppliersTable).orderBy(desc(suppliersTable.rating));
  res.json(suppliers);
});

router.patch("/fulfillment/queue/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { supplierId, supplierName, estimatedCost } = req.body as {
    supplierId?: number; supplierName?: string; estimatedCost?: number;
  };
  const [updated] = await db.update(fulfillmentQueueTable)
    .set({
      supplierId: supplierId ?? undefined,
      supplierName: supplierName ?? undefined,
      estimatedCost: estimatedCost?.toString() ?? undefined,
    })
    .where(eq(fulfillmentQueueTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

export default router;
