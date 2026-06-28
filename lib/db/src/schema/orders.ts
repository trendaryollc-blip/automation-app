import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  productId: integer("product_id"),
  productName: text("product_name"),
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  quantity: integer("quantity").notNull().default(1),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  sellPrice: numeric("sell_price", { precision: 10, scale: 2 }),
  profit: numeric("profit", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"),
  trackingNumber: text("tracking_number"),
  shippingAddress: text("shipping_address"),
  placedAt: timestamp("placed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
