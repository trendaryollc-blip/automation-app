import {
  db,
  suppliersTable,
  fulfillmentQueueTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  ordersTable,
  storeConnectionsTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { placeCJOrder } from "./cjdropshipping.js";
import { placeZendropOrder } from "./zendrop.js";
import { detectCategory } from "./fulfillment-utils";

type OrderPayload = {
  id: number;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  sellPrice: string | null;
  storeSource?: string;
};

async function matchBestSupplier(productName: string): Promise<{
  supplierId: number | null;
  supplierName: string;
  estimatedCost: number;
  matchReason: string;
} | null> {
  const suppliers = await db
    .select()
    .from(suppliersTable)
    .orderBy(desc(suppliersTable.rating));
  if (suppliers.length === 0) return null;

  const category = detectCategory(productName);
  let best = suppliers[0];
  let bestScore = 0;
  let bestReason = "";

  for (const s of suppliers) {
    let score = Number(s.rating ?? 3) * 20;
    const nameMatch = s.name
      .toLowerCase()
      .split(/\s+/)
      .some((w) => productName.toLowerCase().includes(w) && w.length > 3);
    if (nameMatch) {
      score += 25;
    }
    if (s.shippingDays != null && s.shippingDays <= 7) score += 15;
    else if (s.shippingDays != null && s.shippingDays <= 14) score += 8;
    if (s.notes?.toLowerCase().includes(category)) score += 10;

    if (score > bestScore) {
      bestScore = score;
      best = s;
      bestReason = nameMatch
        ? `Matched by name similarity and ${Math.round(Number(best.rating ?? 3))}★ rating`
        : `Highest rated supplier (${Number(best.rating ?? 3)}★)${s.shippingDays ? `, ${s.shippingDays}d shipping` : ""}`;
    }
  }

  const sellPriceApprox = 25;
  const estimatedCost = sellPriceApprox * 0.35 + Math.random() * 5;

  return {
    supplierId: best.id,
    supplierName: best.name,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    matchReason:
      bestReason || `Best available supplier (${Number(best.rating ?? 3)}★)`,
  };
}

export async function autoFulfillOrder(order: OrderPayload): Promise<void> {
  const sellPrice = order.sellPrice ? Number(order.sellPrice) : null;

  const match = await matchBestSupplier(order.productName);

  const estimatedCost =
    match?.estimatedCost ?? (sellPrice ? sellPrice * 0.35 : null);
  const estimatedMargin =
    sellPrice && estimatedCost
      ? Math.round(((sellPrice - estimatedCost) / sellPrice) * 100)
      : null;

  await db.insert(fulfillmentQueueTable).values({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    productName: order.productName,
    quantity: order.quantity,
    sellPrice: sellPrice?.toString() ?? null,
    supplierId: match?.supplierId ?? null,
    supplierName: match?.supplierName ?? null,
    estimatedCost: estimatedCost?.toString() ?? null,
    estimatedMargin: estimatedMargin?.toString() ?? null,
    matchReason:
      match?.matchReason ?? "No supplier matched — please assign manually",
    status: "pending_approval",
    autoProcessed: true,
    storeSource: order.storeSource ?? null,
  });
}

export async function approveFulfillmentItem(
  itemId: number,
): Promise<{ success: boolean; poId?: number; error?: string }> {
  const [item] = await db
    .select()
    .from(fulfillmentQueueTable)
    .where(eq(fulfillmentQueueTable.id, itemId));
  if (!item) return { success: false, error: "Item not found" };
  if (item.status !== "pending_approval")
    return { success: false, error: "Item is not pending approval" };

  const count = await db.select().from(purchaseOrdersTable);
  const poNumber = `PO-${String(count.length + 1).padStart(4, "0")}`;

  const unitCost = item.estimatedCost ? Number(item.estimatedCost) : 0;
  const totalCost = unitCost * item.quantity;

  const [po] = await db
    .insert(purchaseOrdersTable)
    .values({
      poNumber,
      supplierId: item.supplierId ?? null,
      supplierName: item.supplierName ?? null,
      status: "draft",
      totalCost: totalCost.toString(),
      notes: `Auto-generated from order ${item.orderNumber} via fulfillment queue`,
    })
    .returning();

  await db.insert(purchaseOrderItemsTable).values({
    purchaseOrderId: po.id,
    productName: item.productName,
    quantity: item.quantity,
    unitCost: unitCost ? unitCost.toString() : null,
    totalCost: totalCost ? totalCost.toString() : null,
  });

  await db
    .update(fulfillmentQueueTable)
    .set({ status: "approved", approvedAt: new Date(), purchaseOrderId: po.id })
    .where(eq(fulfillmentQueueTable.id, itemId));

  await db
    .update(ordersTable)
    .set({ status: "processing" })
    .where(eq(ordersTable.id, item.orderId));

  // If this order came from a CJ Dropshipping / Zendrop connected store,
  // try to place the order externally after local approval.
  if (item.storeSource) {
    try {
      const [conn] = await db
        .select()
        .from(storeConnectionsTable)
        .where(eq(storeConnectionsTable.storeName, item.storeSource));
      if (conn && conn.config) {
        const config = JSON.parse(conn.config) as Record<string, unknown>;
        if (
          conn.platform === "cjdropshipping" &&
          config.apiKey &&
          config.apiSecret
        ) {
          await placeCJOrder({
            productId: item.productName,
            quantity: item.quantity,
            shippingInfo: {
              firstName: item.customerName.split(" ")[0] || "Unknown",
              lastName: item.customerName.split(" ").slice(1).join(" ") || "",
              email: "",
              phone: "",
              address: "",
              city: "",
              state: "",
              zip: "",
              country: "",
            },
          });
        } else if (conn.platform === "zendrop" && config.apiKey) {
          await placeZendropOrder({
            productId: item.productName,
            quantity: item.quantity,
            shippingInfo: {
              firstName: item.customerName.split(" ")[0] || "Unknown",
              lastName: item.customerName.split(" ").slice(1).join(" ") || "",
              email: "",
              phone: "",
              address: "",
              city: "",
              state: "",
              zip: "",
              country: "",
            },
          });
        }
      }
    } catch (err) {
      console.error("[fulfillment] external order placement failed:", err);
    }
  }

  return { success: true, poId: po.id };
}

export async function rejectFulfillmentItem(
  itemId: number,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const [item] = await db
    .select()
    .from(fulfillmentQueueTable)
    .where(eq(fulfillmentQueueTable.id, itemId));
  if (!item) return { success: false, error: "Item not found" };

  await db
    .update(fulfillmentQueueTable)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      rejectionReason: reason ?? null,
    })
    .where(eq(fulfillmentQueueTable.id, itemId));

  return { success: true };
}
