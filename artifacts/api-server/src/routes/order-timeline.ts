import { Router } from "express";
import { db } from "@workspace/db";
import { orderTimelineTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/orders/:id/timeline", async (req, res) => {
  const orderId = parseInt(req.params.id);
  const events = await db
    .select()
    .from(orderTimelineTable)
    .where(eq(orderTimelineTable.orderId, orderId))
    .orderBy(orderTimelineTable.createdAt);
  res.json(events);
});

router.post("/orders/:id/timeline", async (req, res) => {
  const orderId = parseInt(req.params.id);
  const [event] = await db
    .insert(orderTimelineTable)
    .values({ ...req.body, orderId })
    .returning();
  res.status(201).json(event);
});

export default router;
