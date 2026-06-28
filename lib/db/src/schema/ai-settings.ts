import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const aiSettingsTable = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().unique(),
  apiKey: text("api_key").notNull(),
  model: text("model"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
