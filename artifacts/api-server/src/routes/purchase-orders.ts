import { Router } from "express";
import { db } from "@workspace/db";
import { purchaseOrdersTable, purchaseOrderItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/purchase-orders", async (req, res) => {
  const pos = await db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.createdAt);
  res.json(pos.reverse());
});

router.get("/purchase-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  if (!po) return res.status(404).json({ error: "Not found" });
  const items = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.purchaseOrderId, id));
  return res.json({ ...po, items });
});

router.post("/purchase-orders", async (req, res) => {
  const { items = [], ...poData } = req.body;
  const count = await db.select().from(purchaseOrdersTable);
  const poNumber = `PO-${String(count.length + 1).padStart(4, "0")}`;
  const totalCost = items.reduce((s: number, i: any) => s + (Number(i.unitCost || 0) * Number(i.quantity || 1)), 0);
  const [po] = await db.insert(purchaseOrdersTable).values({ ...poData, poNumber, totalCost: String(totalCost) }).returning();
  if (items.length > 0) {
    await db.insert(purchaseOrderItemsTable).values(items.map((item: any) => ({
      purchaseOrderId: po.id,
      productName: item.productName,
      productId: item.productId ?? null,
      quantity: Number(item.quantity) || 1,
      unitCost: item.unitCost ? String(item.unitCost) : null,
      totalCost: item.unitCost ? String(Number(item.unitCost) * (Number(item.quantity) || 1)) : null,
    })));
  }
  return res.status(201).json(po);
});

router.patch("/purchase-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { items, ...updates } = req.body;
  const now = new Date();
  if (updates.status === "sent" && !updates.sentAt) updates.sentAt = now;
  if (updates.status === "confirmed" && !updates.confirmedAt) updates.confirmedAt = now;
  if (updates.status === "received" && !updates.receivedAt) updates.receivedAt = now;
  const [updated] = await db.update(purchaseOrdersTable).set({ ...updates, updatedAt: now }).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

router.delete("/purchase-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.purchaseOrderId, id));
  await db.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  return res.json({ success: true });
});

export default router;
