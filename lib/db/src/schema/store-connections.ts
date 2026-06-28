import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storeConnectionsTable = pgTable("store_connections", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull(),
  storeUrl: text("store_url"),
  platform: text("platform").notNull().default("custom"),
  apiKey: text("api_key").notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  totalOrdersSynced: integer("total_orders_synced").notNull().default(0),
  totalProductsSynced: integer("total_products_synced").notNull().default(0),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  config: text("config"),
});

export const syncLogsTable = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  storeConnectionId: integer("store_connection_id").notNull(),
  event: text("event").notNull(),
  status: text("status").notNull().default("success"),
  payload: text("payload"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertStoreConnectionSchema = createInsertSchema(
  storeConnectionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStoreConnection = z.infer<typeof insertStoreConnectionSchema>;
export type StoreConnection = typeof storeConnectionsTable.$inferSelect;
export type SyncLog = typeof syncLogsTable.$inferSelect;
