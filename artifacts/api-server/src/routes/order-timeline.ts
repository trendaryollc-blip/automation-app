import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db, orderTimelineTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

const CreateEventBodySchema = z.object({
  event: z.string().min(1).max(200),
  fromStatus: z.string().max(80).nullish(),
  toStatus: z.string().max(80).nullish(),
  note: z.string().max(2000).nullish(),
});

router.get("/orders/:id/timeline", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const events = await db
    .select()
    .from(orderTimelineTable)
    .where(
      and(
        eq(orderTimelineTable.orderId, params.data.id),
        eq(orderTimelineTable.userId, user.id),
      ),
    )
    .orderBy(orderTimelineTable.createdAt);
  res.json(events);
});

router.post("/orders/:id/timeline", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateEventBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const [event] = await db
    .insert(orderTimelineTable)
    .values({
      userId: user.id,
      orderId: params.data.id,
      event: parsed.data.event,
      fromStatus: parsed.data.fromStatus ?? null,
      toStatus: parsed.data.toStatus ?? null,
      note: parsed.data.note ?? null,
    })
    .returning();
  res.status(201).json(event);
});

export default router;
