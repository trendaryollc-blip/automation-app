import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const fulfillmentQueueTable = pgTable("fulfillment_queue", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  sellPrice: numeric("sell_price", { precision: 10, scale: 2 }),
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  estimatedMargin: numeric("estimated_margin", { precision: 5, scale: 2 }),
  matchReason: text("match_reason"),
  status: text("status").notNull().default("pending_approval"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  purchaseOrderId: integer("purchase_order_id"),
  autoProcessed: boolean("auto_processed").notNull().default(true),
  storeSource: text("store_source"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type FulfillmentQueueItem = typeof fulfillmentQueueTable.$inferSelect;
