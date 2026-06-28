import { Router, type IRouter } from "express";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { db, ordersTable, productsTable, orderTimelineTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderParams,
  UpdateOrderBody,
  DeleteOrderParams,
  BulkUpdateOrdersBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

let orderCounter = 1000;

const formatOrder = (o: typeof ordersTable.$inferSelect) => ({
  ...o,
  costPrice: o.costPrice != null ? Number(o.costPrice) : null,
  sellPrice: o.sellPrice != null ? Number(o.sellPrice) : null,
  profit: o.profit != null ? Number(o.profit) : null,
  createdAt: o.createdAt.toISOString(),
  updatedAt: o.updatedAt.toISOString(),
  placedAt: o.placedAt != null ? o.placedAt.toISOString() : null,
});

router.post("/orders/bulk-update", async (req, res): Promise<void> => {
  const parsed = BulkUpdateOrdersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { orderIds, status, trackingNumber } = parsed.data;
  if (!status && !trackingNumber) {
    res.status(400).json({ error: "At least one of status or trackingNumber must be provided" });
    return;
  }

  // Fetch existing orders before updating (for stock decrement logic)
  const existingOrders = status === "delivered"
    ? await db.select().from(ordersTable).where(inArray(ordersTable.id, orderIds))
    : [];

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (trackingNumber) updateData.trackingNumber = trackingNumber;

  const updated = await db
    .update(ordersTable)
    .set(updateData)
    .where(inArray(ordersTable.id, orderIds))
    .returning();

  // Auto-decrement stock for orders newly transitioned to "delivered"
  if (status === "delivered") {
    const toDecrement = existingOrders.filter(
      (o) => o.status !== "delivered" && o.productId != null
    );
    for (const o of toDecrement) {
      await db
        .update(productsTable)
        .set({
          stockQuantity: sql`GREATEST(0, COALESCE(stock_quantity, 0) - ${o.quantity})`,
        })
        .where(eq(productsTable.id, o.productId!));
    }
  }

  res.json({
    updatedCount: updated.length,
    orders: updated.map(formatOrder),
  });
});

router.post("/orders/import", async (req, res): Promise<void> => {
  const { rows } = req.body as { rows: Record<string, unknown>[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows must be a non-empty array" });
    return;
  }
  const imported: number[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.productName || typeof row.productName !== "string") {
      errors.push({ row: i + 1, error: "Missing required field: productName" });
      continue;
    }
    try {
      const costPrice = row.costPrice != null && row.costPrice !== "" ? Number(row.costPrice) : null;
      const sellPrice = row.sellPrice != null && row.sellPrice !== "" ? Number(row.sellPrice) : null;
      const qty = row.quantity != null ? Number(row.quantity) : 1;
      const profit = costPrice != null && sellPrice != null ? String((sellPrice - costPrice) * qty) : undefined;
      const [order] = await db
        .insert(ordersTable)
        .values({
          orderNumber: row.orderNumber ? String(row.orderNumber) : `DF-${Date.now()}-${i}`,
          productName: String(row.productName),
          customerName: row.customerName ? String(row.customerName) : "Unknown",
          customerEmail: row.customerEmail ? String(row.customerEmail) : null,
          quantity: qty,
          status: (row.status as any) || "pending",
          costPrice: costPrice != null ? String(costPrice) : null,
          sellPrice: sellPrice != null ? String(sellPrice) : null,
          profit: profit ?? null,
          trackingNumber: row.trackingNumber ? String(row.trackingNumber) : null,
          supplierName: row.supplierName ? String(row.supplierName) : null,
        })
        .returning();
      imported.push(order.id);
    } catch (e: any) {
      errors.push({ row: i + 1, error: e.message ?? "Insert failed" });
    }
  }

  res.status(200).json({ imported: imported.length, errors });
});

router.get("/orders", async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let query = db.select().from(ordersTable).$dynamic();
  if (parsed.data.status) {
    query = query.where(eq(ordersTable.status, parsed.data.status));
  }
  const orders = await query.orderBy(desc(ordersTable.createdAt));
  res.json(orders.map(formatOrder));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  orderCounter++;
  const { costPrice, sellPrice, ...rest } = parsed.data;
  const cost = costPrice != null ? Number(costPrice) : null;
  const sell = sellPrice != null ? Number(sellPrice) : null;
  const profit = cost != null && sell != null ? (sell - cost) * (rest.quantity ?? 1) : null;
  const orderNumber = rest.orderNumber ?? `DF-${Date.now()}`;
  const [order] = await db
    .insert(ordersTable)
    .values({
      ...rest,
      orderNumber,
      costPrice: cost != null ? String(cost) : undefined,
      sellPrice: sell != null ? String(sell) : undefined,
      profit: profit != null ? String(profit) : undefined,
    })
    .returning();

  // Log creation event in timeline
  await db.insert(orderTimelineTable).values({
    orderId: order.id,
    event: "Order created",
    toStatus: order.status,
  });

  res.status(201).json(formatOrder(order));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { costPrice, sellPrice, placedAt, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (costPrice !== undefined) updateData.costPrice = costPrice != null ? String(costPrice) : null;
  if (sellPrice !== undefined) updateData.sellPrice = sellPrice != null ? String(sellPrice) : null;
  if (placedAt !== undefined) updateData.placedAt = placedAt != null ? new Date(placedAt) : null;

  const existing = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!existing[0]) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (costPrice !== undefined || sellPrice !== undefined) {
    const cost = costPrice !== undefined ? (costPrice != null ? Number(costPrice) : null) : (existing[0].costPrice != null ? Number(existing[0].costPrice) : null);
    const sell = sellPrice !== undefined ? (sellPrice != null ? Number(sellPrice) : null) : (existing[0].sellPrice != null ? Number(existing[0].sellPrice) : null);
    const qty = rest.quantity ?? existing[0].quantity;
    if (cost != null && sell != null) {
      updateData.profit = String((sell - cost) * qty);
    }
  }

  const [order] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  // Auto-decrement stock when an order transitions to "delivered"
  if (
    rest.status === "delivered" &&
    existing[0].status !== "delivered" &&
    order.productId != null
  ) {
    await db
      .update(productsTable)
      .set({
        stockQuantity: sql`GREATEST(0, COALESCE(stock_quantity, 0) - ${order.quantity})`,
      })
      .where(eq(productsTable.id, order.productId));
  }

  // Auto-log timeline event on status change
  if (rest.status && rest.status !== existing[0].status) {
    await db.insert(orderTimelineTable).values({
      orderId: order.id,
      event: `Status changed to ${rest.status}`,
      fromStatus: existing[0].status,
      toStatus: rest.status,
    });
  }

  res.json(formatOrder(order));
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const params = DeleteOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db
    .delete(ordersTable)
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
