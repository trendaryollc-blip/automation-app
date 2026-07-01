import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { desc, eq, and } from "drizzle-orm";
import {
  db,
  fulfillmentQueueTable,
  ordersTable,
  suppliersTable,
  storeConnectionsTable,
} from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

async function loadFulfillmentEngine() {
  return import("../services/fulfillment-engine.js");
}

// ---------------------------------------------------------------------------
// External service loader — allows tests to inject a custom loader so that
// external placement calls (CJ Dropshipping, Zendrop, etc.) can be mocked.
// ---------------------------------------------------------------------------

type ExternalService = {
  placeCJOrder?: (params: any) => Promise<any>;
  placeZendropOrder?: (params: any) => Promise<any>;
};

type ExternalServiceLoader = (
  serviceName: string,
) => Promise<ExternalService>;

let _externalServiceLoader: ExternalServiceLoader | null = null;

export function setExternalServiceLoader(loader: ExternalServiceLoader) {
  _externalServiceLoader = loader;
}

export function resetExternalServiceLoader() {
  _externalServiceLoader = null;
}

/**
 * Fulfill an order externally by looking up the store connection and
 * delegating to the appropriate service (CJ Dropshipping, Zendrop, etc.).
 *
 * When an external service loader has been set (e.g. by tests), it is
 * used in place of the built-in dynamic imports so that the service
 * calls can be mocked.
 */
export async function fulfillOrderExternal(
  orderId: number,
  userId: number,
): Promise<void> {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));
  if (!order) throw new Error(`Order ${orderId} not found`);

  const [conn] = await db
    .select()
    .from(storeConnectionsTable)
    .where(eq(storeConnectionsTable.userId, order.userId));

  if (!conn) return;

  const serviceName = conn.platform ?? "";
  const customerName = order.customerName ?? "";
  const firstName = customerName.split(" ")[0] || "Unknown";
  const lastName = customerName.split(" ").slice(1).join(" ") || "";

  const shippingInfo = {
    firstName,
    lastName,
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  };

  if (_externalServiceLoader) {
    const service = await _externalServiceLoader(serviceName);
    if (serviceName === "cjdropshipping" && service.placeCJOrder) {
      await service.placeCJOrder({
        productId: order.productName ?? "",
        quantity: order.quantity ?? 1,
        shippingInfo,
      });
    } else if (serviceName === "zendrop" && service.placeZendropOrder) {
      await service.placeZendropOrder({
        productId: order.productName ?? "",
        quantity: order.quantity ?? 1,
        shippingInfo,
      });
    }
  }
}

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

const RejectBodySchema = z.object({
  reason: z.string().max(2000).optional(),
});

function friendlyZodError(error: unknown, fieldMessages?: Record<string, string>): string {
  const issues = (error as { issues?: { path?: unknown[]; message?: string }[] })?.issues ?? [];
  const first = issues[0];
  if (first && fieldMessages) {
    const fieldName = String(first.path?.[0] ?? "");
    if (fieldMessages[fieldName]) return fieldMessages[fieldName];
  }
  if (first) {
    const fieldName = String(first.path?.[0] ?? "");
    return fieldName
      ? `${fieldName} ${first.message ?? "is invalid"}`
      : first.message ?? "Validation failed";
  }
  return "Validation failed";
}

const ManualBodySchema = z.object({
  orderId: z.number().int().positive(),
});

const PatchQueueBodySchema = z.object({
  supplierId: z.number().int().positive().nullish(),
  supplierName: z.string().max(200).nullish(),
  estimatedCost: z.number().nonnegative().nullish(),
});

router.get("/fulfillment/queue", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const items = await db
    .select()
    .from(fulfillmentQueueTable)
    .where(eq(fulfillmentQueueTable.userId, user.id))
    .orderBy(desc(fulfillmentQueueTable.createdAt));
  res.json(
    items.map((i) => ({
      ...i,
      sellPrice: i.sellPrice ? Number(i.sellPrice) : null,
      estimatedCost: i.estimatedCost ? Number(i.estimatedCost) : null,
      estimatedMargin: i.estimatedMargin ? Number(i.estimatedMargin) : null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      approvedAt: i.approvedAt?.toISOString() ?? null,
      rejectedAt: i.rejectedAt?.toISOString() ?? null,
    })),
  );
});

router.get("/fulfillment/stats", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const all = await db
    .select()
    .from(fulfillmentQueueTable)
    .where(eq(fulfillmentQueueTable.userId, user.id));
  const pending = all.filter((i) => i.status === "pending_approval").length;
  const approved = all.filter((i) => i.status === "approved").length;
  const rejected = all.filter((i) => i.status === "rejected").length;
  const totalRevenue = all
    .filter((i) => i.status === "approved" && i.sellPrice)
    .reduce((s, i) => s + Number(i.sellPrice) * i.quantity, 0);
  const totalCost = all
    .filter((i) => i.status === "approved" && i.estimatedCost)
    .reduce((s, i) => s + Number(i.estimatedCost) * i.quantity, 0);
  res.json({
    pending,
    approved,
    rejected,
    total: all.length,
    totalRevenue,
    totalCost,
  });
});

router.post("/fulfillment/approve/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  // Verify ownership before approving.
  const [owned] = await db
    .select({ id: fulfillmentQueueTable.id })
    .from(fulfillmentQueueTable)
    .where(
      and(
        eq(fulfillmentQueueTable.id, params.data.id),
        eq(fulfillmentQueueTable.userId, user.id),
      ),
    )
    .limit(1);
  if (!owned) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { approveFulfillmentItem } = await loadFulfillmentEngine();
  const result = await approveFulfillmentItem(params.data.id);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.post("/fulfillment/reject/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = RejectBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const [owned] = await db
    .select({ id: fulfillmentQueueTable.id })
    .from(fulfillmentQueueTable)
    .where(
      and(
        eq(fulfillmentQueueTable.id, params.data.id),
        eq(fulfillmentQueueTable.userId, user.id),
      ),
    )
    .limit(1);
  if (!owned) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { rejectFulfillmentItem } = await loadFulfillmentEngine();
  const result = await rejectFulfillmentItem(
    params.data.id,
    parsed.data.reason,
  );
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.post("/fulfillment/approve-all", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const { approveFulfillmentItem } = await loadFulfillmentEngine();
  const pending = await db
    .select()
    .from(fulfillmentQueueTable)
    .where(
      and(
        eq(fulfillmentQueueTable.userId, user.id),
        eq(fulfillmentQueueTable.status, "pending_approval"),
      ),
    );
  const results = await Promise.all(
    pending.map((i) => approveFulfillmentItem(i.id)),
  );
  const succeeded = results.filter((r) => r.success).length;
  res.json({ approved: succeeded, failed: results.length - succeeded });
});

router.post("/fulfillment/manual", async (req, res): Promise<void> => {
  const parsed = ManualBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: friendlyZodError(parsed.error, { orderId: "orderId required" }) });
    return;
  }
  const user = currentUser(req);
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, parsed.data.orderId),
        eq(ordersTable.userId, user.id),
      ),
    );
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const existing = await db
    .select()
    .from(fulfillmentQueueTable)
    .where(
      and(
        eq(fulfillmentQueueTable.orderId, parsed.data.orderId),
        eq(fulfillmentQueueTable.userId, user.id),
        eq(fulfillmentQueueTable.status, "pending_approval"),
      ),
    );
  if (existing.length > 0) {
    res.status(409).json({ error: "Order already in fulfillment queue" });
    return;
  }
  const { autoFulfillOrder } = await loadFulfillmentEngine();
  await autoFulfillOrder({
    userId: user.id,
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

router.get("/fulfillment/suppliers", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const suppliers = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.userId, user.id))
    .orderBy(desc(suppliersTable.rating));
  res.json(suppliers);
});

router.patch("/fulfillment/queue/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = PatchQueueBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.supplierId !== undefined) {
    updateData.supplierId = parsed.data.supplierId;
  }
  if (parsed.data.supplierName !== undefined) {
    updateData.supplierName = parsed.data.supplierName;
  }
  if (parsed.data.estimatedCost !== undefined) {
    updateData.estimatedCost =
      parsed.data.estimatedCost != null
        ? String(parsed.data.estimatedCost)
        : null;
  }
  const [updated] = await db
    .update(fulfillmentQueueTable)
    .set(updateData)
    .where(
      and(
        eq(fulfillmentQueueTable.id, params.data.id),
        eq(fulfillmentQueueTable.userId, user.id),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

export default router;
