import { Router } from "express";
import { db } from "@workspace/db";
import { returnsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/returns", async (req, res) => {
  const all = await db.select().from(returnsTable).orderBy(returnsTable.createdAt);
  res.json(all.reverse());
});

router.post("/returns", async (req, res) => {
  const count = await db.select().from(returnsTable);
  const returnNumber = `RET-${String(count.length + 1).padStart(4, "0")}`;
  const [ret] = await db.insert(returnsTable).values({ ...req.body, returnNumber }).returning();
  return res.status(201).json(ret);
});

router.patch("/returns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [updated] = await db.update(returnsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(returnsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

router.delete("/returns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(returnsTable).where(eq(returnsTable.id, id));
  return res.json({ success: true });
});

export default router;
