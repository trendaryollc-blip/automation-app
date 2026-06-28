import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supplierFinderTable = pgTable("supplier_finder", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  targetCostPrice: numeric("target_cost_price", { precision: 10, scale: 2 }),
  preferredCountry: text("preferred_country"),
  topPick: text("top_pick").notNull(),
  matches: jsonb("matches").notNull().$type<
    {
      supplierId: number | null;
      name: string;
      country: string;
      estimatedCostPrice: number;
      shippingDays: number;
      rating: number;
      matchScore: number;
      matchReason: string;
      pros: string[];
      isExisting: boolean;
      website: string | null;
      contactEmail: string | null;
    }[]
  >(),
  sourcingTips: jsonb("sourcing_tips").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSupplierFinderSchema = createInsertSchema(
  supplierFinderTable,
).omit({ id: true, createdAt: true });
export type InsertSupplierFinder = z.infer<typeof insertSupplierFinderSchema>;
export type SupplierFinder = typeof supplierFinderTable.$inferSelect;
