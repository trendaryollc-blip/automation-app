import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiSettingsTable = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  apiKey: text("api_key").notNull(),
  model: text("model"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
