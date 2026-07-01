import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import {
  db,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
} from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const PurchaseOrderStatusEnum = z.enum([
  "draft",
  "sent",
  "confirmed",
  "shipped",
  "received",
  "cancelled",
]);

const PurchaseOrderItemSchema = z.object({
  productId: z.number().int().positive().nullish(),
  productName: z.string().min(1).max(200),
  quantity: z.number().int().positive().default(1),
  unitCost: z.number().nonnegative().nullish(),
});

const CreatePurchaseOrderBodySchema = z.object({
  supplierId: z.number().int().positive().nullish(),
  supplierName: z.string().max(200).nullish(),
  status: PurchaseOrderStatusEnum.optional(),
  notes: z.string().max(4000).nullish(),
  expectedAt: z.union([z.string(), z.date()]).nullish(),
  items: z.array(PurchaseOrderItemSchema).max(1000).default([]),
});

const UpdatePurchaseOrderBodySchema = z.object({
  supplierId: z.number().int().positive().nullish(),
  supplierName: z.string().max(200).nullish(),
  status: PurchaseOrderStatusEnum.optional(),
  notes: z.string().max(4000).nullish(),
  expectedAt: z.union([z.string(), z.date()]).nullish(),
  items: z.array(PurchaseOrderItemSchema).max(1000).optional(),
});

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

function generatePurchaseOrderNumber(): string {
  const ts = Date.now().toString(16).padStart(8, "0").toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PO-${ts}-${rand}`;
}

router.get("/purchase-orders", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const pos = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.userId, user.id))
    .orderBy(purchaseOrdersTable.createdAt);
  res.json(pos.reverse());
});

router.get("/purchase-orders/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [po] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(
      and(
        eq(purchaseOrdersTable.id, params.data.id),
        eq(purchaseOrdersTable.userId, user.id),
      ),
    );
  if (!po) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const items = await db
    .select()
    .from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, params.data.id));
  res.json({ ...po, items });
});

router.post("/purchase-orders", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseOrderBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { items = [], ...poData } = parsed.data;
  const poNumber = generatePurchaseOrderNumber();
  const totalCost = items.reduce(
    (s, i) => s + Number(i.unitCost || 0) * Number(i.quantity || 1),
    0,
  );
  const [po] = await db
    .insert(purchaseOrdersTable)
    .values({
      userId: user.id,
      poNumber,
      supplierId: poData.supplierId ?? null,
      supplierName: poData.supplierName ?? null,
      status: poData.status ?? "draft",
      notes: poData.notes ?? null,
      expectedAt: poData.expectedAt ? new Date(poData.expectedAt) : null,
      totalCost: String(totalCost),
    })
    .returning();
  if (items.length > 0) {
    await db.insert(purchaseOrderItemsTable).values(
      items.map((item) => ({
        purchaseOrderId: po.id,
        productName: item.productName,
        productId: item.productId ?? null,
        quantity: Number(item.quantity) || 1,
        unitCost: item.unitCost != null ? String(item.unitCost) : null,
        totalCost:
          item.unitCost != null
            ? String(Number(item.unitCost) * (Number(item.quantity) || 1))
            : null,
      })),
    );
  }
  res.status(201).json(po);
});

router.patch("/purchase-orders/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePurchaseOrderBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { items, ...updates } = parsed.data;
  const now = new Date();
  const updateData: Record<string, unknown> = { ...updates, updatedAt: now };
  if (updates.status === "sent" && !updateData.sentAt) updateData.sentAt = now;
  if (updates.status === "confirmed" && !updateData.confirmedAt)
    updateData.confirmedAt = now;
  if (updates.status === "received" && !updateData.receivedAt)
    updateData.receivedAt = now;
  const [updated] = await db
    .update(purchaseOrdersTable)
    .set(updateData)
    .where(
      and(
        eq(purchaseOrdersTable.id, params.data.id),
        eq(purchaseOrdersTable.userId, user.id),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/purchase-orders/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  await db
    .delete(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, params.data.id));
  await db
    .delete(purchaseOrdersTable)
    .where(
      and(
        eq(purchaseOrdersTable.id, params.data.id),
        eq(purchaseOrdersTable.userId, user.id),
      ),
    );
  res.json({ success: true });
});

export default router;
