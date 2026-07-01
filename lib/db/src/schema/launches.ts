import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const launchesTable = pgTable("launches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  productId: integer("product_id"),
  status: text("status").notNull().default("planning"),
  targetLaunchDate: timestamp("target_launch_date", { withTimezone: true }),
  notes: text("notes"),
  steps: jsonb("steps").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertLaunchSchema = createInsertSchema(launchesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLaunch = z.infer<typeof insertLaunchSchema>;
export type Launch = typeof launchesTable.$inferSelect;
