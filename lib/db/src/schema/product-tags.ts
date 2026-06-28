import { pgTable, text, serial, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productTagsTable = pgTable("product_tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#818cf8"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productTagLinksTable = pgTable("product_tag_links", {
  productId: integer("product_id").notNull(),
  tagId: integer("tag_id").notNull(),
}, (t) => [primaryKey({ columns: [t.productId, t.tagId] })]);

export const insertProductTagSchema = createInsertSchema(productTagsTable).omit({ id: true, createdAt: true });
export const insertProductTagLinkSchema = createInsertSchema(productTagLinksTable);
export type InsertProductTag = z.infer<typeof insertProductTagSchema>;
export type ProductTag = typeof productTagsTable.$inferSelect;
export type ProductTagLink = typeof productTagLinksTable.$inferSelect;
