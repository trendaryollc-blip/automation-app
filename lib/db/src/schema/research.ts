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

export const researchTable = pgTable("research", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  demandScore: integer("demand_score").notNull(),
  competitionLevel: text("competition_level").notNull(),
  suggestedPrice: integer("suggested_price").notNull(),
  estimatedMargin: integer("estimated_margin").notNull(),
  topNiches: jsonb("top_niches")
    .notNull()
    .$type<{ name: string; score: number }[]>(),
  pros: jsonb("pros").notNull().$type<string[]>(),
  cons: jsonb("cons").notNull().$type<string[]>(),
  verdict: text("verdict").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertResearchSchema = createInsertSchema(researchTable).omit({
  id: true,
  createdAt: true,
});
export type InsertResearch = z.infer<typeof insertResearchSchema>;
export type Research = typeof researchTable.$inferSelect;
