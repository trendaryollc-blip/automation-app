import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adCampaignsTable = pgTable("ad_campaigns", {
  id: serial("id").primaryKey(),
  campaignName: text("campaign_name").notNull(),
  platform: text("platform").notNull().default("facebook"),
  productId: integer("product_id"),
  productName: text("product_name"),
  spend: numeric("spend", { precision: 10, scale: 2 }).notNull().default("0"),
  revenue: numeric("revenue", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAdCampaignSchema = createInsertSchema(adCampaignsTable).omit(
  { id: true, createdAt: true, updatedAt: true },
);
export type InsertAdCampaign = z.infer<typeof insertAdCampaignSchema>;
export type AdCampaign = typeof adCampaignsTable.$inferSelect;
