import { Router } from "express";
import { db } from "@workspace/db";
import { promotionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/promotions", async (req, res) => {
  const all = await db
    .select()
    .from(promotionsTable)
    .orderBy(promotionsTable.createdAt);
  res.json(all.reverse());
});

router.post("/promotions", async (req, res) => {
  const [promo] = await db.insert(promotionsTable).values(req.body).returning();
  return res.status(201).json(promo);
});

router.patch("/promotions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [updated] = await db
    .update(promotionsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(promotionsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

router.delete("/promotions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(promotionsTable).where(eq(promotionsTable.id, id));
  return res.json({ success: true });
});

export default router;
