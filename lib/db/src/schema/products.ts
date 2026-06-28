import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  niche: text("niche"),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  sellPrice: numeric("sell_price", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("hunting"),
  description: text("description"),
  aiDescription: text("ai_description"),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"),
  notes: text("notes"),
  supplierId: integer("supplier_id"),
  stockQuantity: integer("stock_quantity"),
  stockThreshold: integer("stock_threshold"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
