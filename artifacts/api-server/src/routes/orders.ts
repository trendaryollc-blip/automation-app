import { Router, type IRouter } from "express";
import { eq, desc, inArray, sql, and, type SQL } from "drizzle-orm";
import { z } from "zod/v4";
import crypto from "node:crypto";
import {
  db,
  ordersTable,
  productsTable,
  orderTimelineTable,
} from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Local Zod schemas
// ---------------------------------------------------------------------------

const OrderStatusEnum = z.enum([
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

const ListOrdersQuerySchema = z.object({
  status: OrderStatusEnum.optional(),
});

const CreateOrderBodySchema = z.object({
  orderNumber: z.string().max(80).nullish(),
  productId: z.number().int().positive().nullish(),
  productName: z.string().max(200).nullish(),
  supplierId: z.number().int().positive().nullish(),
  supplierName: z.string().max(200).nullish(),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().max(254).nullish(),
  quantity: z.number().int().positive().default(1),
  costPrice: z.number().nonnegative().nullish(),
  sellPrice: z.number().nonnegative().nullish(),
  status: OrderStatusEnum.optional(),
  trackingNumber: z.string().max(200).nullish(),
  shippingAddress: z.string().max(2000).nullish(),
  placedAt: z.union([z.string(), z.date()]).nullish(),
});

const UpdateOrderBodySchema = CreateOrderBodySchema.partial();

const BulkUpdateBodySchema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1).max(1000),
  status: OrderStatusEnum.optional(),
  trackingNumber: z.string().max(200).optional(),
});

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

const ImportRowSchema = z.object({
  orderNumber: z.string().nullish(),
  productName: z.string().min(1),
  customerName: z.string().nullish(),
  customerEmail: z.string().nullish(),
  quantity: z.union([z.number(), z.string()]).nullish(),
  status: OrderStatusEnum.optional(),
  costPrice: z.union([z.number(), z.string()]).nullish(),
  sellPrice: z.union([z.number(), z.string()]).nullish(),
  trackingNumber: z.string().nullish(),
  supplierName: z.string().nullish(),
});

const ImportBodySchema = z.object({
  rows: z.array(ImportRowSchema).min(1).max(10_000),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a collision-resistant order number.
 *
 * Format: `DF-<8 hex timestamp>-<4 hex random>`.  This is process-local
 * and never collides across cold starts; the database's UNIQUE
 * constraint on `order_number` is the final source of truth.
 */
function generateOrderNumber(): string {
  const ts = Date.now().toString(16).padStart(8, "0").toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `DF-${ts}-${rand}`;
}

const formatOrder = (o: typeof ordersTable.$inferSelect) => ({
  ...o,
  costPrice: o.costPrice != null ? Number(o.costPrice) : null,
  sellPrice: o.sellPrice != null ? Number(o.sellPrice) : null,
  profit: o.profit != null ? Number(o.profit) : null,
  createdAt: o.createdAt.toISOString(),
  updatedAt: o.updatedAt.toISOString(),
  placedAt: o.placedAt != null ? o.placedAt.toISOString() : null,
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.post("/orders/bulk-update", async (req, res): Promise<void> => {
  const parsed = BulkUpdateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { orderIds, status, trackingNumber } = parsed.data;
  if (!status && !trackingNumber) {
    res.status(400).json({
      error: "At least one of status or trackingNumber must be provided",
    });
    return;
  }
  const user = currentUser(req);

  // Fetch existing orders before updating (for stock decrement logic)
  const existingOrders =
    status === "delivered"
      ? await db
          .select()
          .from(ordersTable)
          .where(
            and(
              inArray(ordersTable.id, orderIds),
              eq(ordersTable.userId, user.id),
            ),
          )
      : [];

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (trackingNumber) updateData.trackingNumber = trackingNumber;

  const updated = await db
    .update(ordersTable)
    .set(updateData)
    .where(
      and(inArray(ordersTable.id, orderIds), eq(ordersTable.userId, user.id)),
    )
    .returning();

  // Auto-decrement stock for orders newly transitioned to "delivered"
  if (status === "delivered") {
    const toDecrement = existingOrders.filter(
      (o) => o.status !== "delivered" && o.productId != null,
    );
    for (const o of toDecrement) {
      await db
        .update(productsTable)
        .set({
          stockQuantity: sql`GREATEST(0, COALESCE(stock_quantity, 0) - ${o.quantity})`,
        })
        .where(
          and(
            eq(productsTable.id, o.productId!),
            eq(productsTable.userId, user.id),
          ),
        );
    }
  }

  res.json({
    updatedCount: updated.length,
    orders: updated.map(formatOrder),
  });
});

router.post("/orders/import", async (req, res): Promise<void> => {
  const parsed = ImportBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { rows } = parsed.data;
  const imported: number[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const costPrice =
        row.costPrice != null && row.costPrice !== ""
          ? Number(row.costPrice)
          : null;
      const sellPrice =
        row.sellPrice != null && row.sellPrice !== ""
          ? Number(row.sellPrice)
          : null;
      const qty = row.quantity != null ? Number(row.quantity) : 1;
      const profit =
        costPrice != null && sellPrice != null
          ? String((sellPrice - costPrice) * qty)
          : null;
      const [order] = await db
        .insert(ordersTable)
        .values({
          userId: user.id,
          orderNumber: row.orderNumber
            ? String(row.orderNumber)
            : generateOrderNumber(),
          productName: row.productName,
          customerName: row.customerName ? String(row.customerName) : "Unknown",
          customerEmail: row.customerEmail ? String(row.customerEmail) : null,
          quantity: qty,
          status: row.status ?? "pending",
          costPrice: costPrice != null ? String(costPrice) : null,
          sellPrice: sellPrice != null ? String(sellPrice) : null,
          profit,
          trackingNumber: row.trackingNumber
            ? String(row.trackingNumber)
            : null,
          supplierName: row.supplierName ? String(row.supplierName) : null,
        })
        .returning();
      imported.push(order.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Insert failed";
      errors.push({ row: i + 1, error: msg });
    }
  }

  res.status(200).json({ imported: imported.length, errors });
});

router.get("/orders", async (req, res): Promise<void> => {
  const parsed = ListOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const filters: SQL[] = [eq(ordersTable.userId, user.id)];
  if (parsed.data.status) {
    filters.push(eq(ordersTable.status, parsed.data.status));
  }
  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(...filters))
    .orderBy(desc(ordersTable.createdAt));
  res.json(orders.map(formatOrder));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { costPrice, sellPrice, placedAt, ...rest } = parsed.data;
  const cost = costPrice != null ? Number(costPrice) : null;
  const sell = sellPrice != null ? Number(sellPrice) : null;
  const profit =
    cost != null && sell != null ? (sell - cost) * (rest.quantity ?? 1) : null;
  const orderNumber = rest.orderNumber ?? generateOrderNumber();
  const [order] = await db
    .insert(ordersTable)
    .values({
      ...rest,
      userId: user.id,
      orderNumber,
      costPrice: cost != null ? String(cost) : undefined,
      sellPrice: sell != null ? String(sell) : undefined,
      profit: profit != null ? String(profit) : undefined,
      placedAt: placedAt ? new Date(placedAt) : undefined,
    })
    .returning();

  // Log creation event in timeline
  await db.insert(orderTimelineTable).values({
    userId: user.id,
    orderId: order.id,
    event: "Order created",
    toStatus: order.status,
  });

  res.status(201).json(formatOrder(order));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(eq(ordersTable.id, params.data.id), eq(ordersTable.userId, user.id)),
    );
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { costPrice, sellPrice, placedAt, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (costPrice !== undefined)
    updateData.costPrice = costPrice != null ? String(costPrice) : null;
  if (sellPrice !== undefined)
    updateData.sellPrice = sellPrice != null ? String(sellPrice) : null;
  if (placedAt !== undefined)
    updateData.placedAt = placedAt != null ? new Date(placedAt) : null;

  const existing = await db
    .select()
    .from(ordersTable)
    .where(
      and(eq(ordersTable.id, params.data.id), eq(ordersTable.userId, user.id)),
    );
  if (!existing[0]) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (costPrice !== undefined || sellPrice !== undefined) {
    const cost =
      costPrice !== undefined
        ? costPrice != null
          ? Number(costPrice)
          : null
        : existing[0].costPrice != null
          ? Number(existing[0].costPrice)
          : null;
    const sell =
      sellPrice !== undefined
        ? sellPrice != null
          ? Number(sellPrice)
          : null
        : existing[0].sellPrice != null
          ? Number(existing[0].sellPrice)
          : null;
    const qty = rest.quantity ?? existing[0].quantity;
    if (cost != null && sell != null) {
      updateData.profit = String((sell - cost) * qty);
    }
  }

  const [order] = await db
    .update(ordersTable)
    .set(updateData)
    .where(
      and(eq(ordersTable.id, params.data.id), eq(ordersTable.userId, user.id)),
    )
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
      .where(
        and(
          eq(productsTable.id, order.productId),
          eq(productsTable.userId, user.id),
        ),
      );
  }

  // Auto-log timeline event on status change
  if (rest.status && rest.status !== existing[0].status) {
    await db.insert(orderTimelineTable).values({
      userId: user.id,
      orderId: order.id,
      event: `Status changed to ${rest.status}`,
      fromStatus: existing[0].status,
      toStatus: rest.status,
    });
  }

  res.json(formatOrder(order));
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [order] = await db
    .delete(ordersTable)
    .where(
      and(eq(ordersTable.id, params.data.id), eq(ordersTable.userId, user.id)),
    )
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
