import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const priceWatchTable = pgTable("price_watch", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  myPrice: numeric("my_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const priceSnapshotsTable = pgTable("price_snapshots", {
  id: serial("id").primaryKey(),
  watchId: integer("watch_id")
    .notNull()
    .references(() => priceWatchTable.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPriceWatchSchema = createInsertSchema(priceWatchTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPriceSnapshotSchema = createInsertSchema(
  priceSnapshotsTable,
).omit({ id: true, recordedAt: true });

export type InsertPriceWatch = z.infer<typeof insertPriceWatchSchema>;
export type InsertPriceSnapshot = z.infer<typeof insertPriceSnapshotSchema>;
export type PriceWatch = typeof priceWatchTable.$inferSelect;
export type PriceSnapshot = typeof priceSnapshotsTable.$inferSelect;
