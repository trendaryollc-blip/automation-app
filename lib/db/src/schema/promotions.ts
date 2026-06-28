import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const promotionsTable = pgTable("promotions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  type: text("type").notNull().default("percentage"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  productId: integer("product_id"),
  productName: text("product_name"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  usageCount: integer("usage_count").notNull().default(0),
  revenueImpact: numeric("revenue_impact", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPromotionSchema = createInsertSchema(promotionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotionsTable.$inferSelect;
