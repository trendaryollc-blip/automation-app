import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const orderTimelineTable = pgTable("order_timeline", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").notNull(),
  event: text("event").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertOrderTimelineSchema = createInsertSchema(
  orderTimelineTable,
).omit({ id: true, createdAt: true });
export type InsertOrderTimeline = z.infer<typeof insertOrderTimelineSchema>;
export type OrderTimeline = typeof orderTimelineTable.$inferSelect;
