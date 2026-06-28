import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const returnsTable = pgTable("returns", {
  id: serial("id").primaryKey(),
  returnNumber: text("return_number").notNull(),
  orderId: integer("order_id"),
  orderNumber: text("order_number"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  productName: text("product_name"),
  quantity: integer("quantity").notNull().default(1),
  reason: text("reason"),
  status: text("status").notNull().default("requested"),
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }),
  restocked: integer("restocked").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReturnSchema = createInsertSchema(returnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type Return = typeof returnsTable.$inferSelect;
