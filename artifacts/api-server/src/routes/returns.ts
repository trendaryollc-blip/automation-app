import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db, returnsTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const ReturnStatusEnum = z.enum([
  "requested",
  "approved",
  "rejected",
  "received",
  "refunded",
  "restocked",
  "cancelled",
]);

const CreateReturnBodySchema = z.object({
  orderId: z.number().int().positive().nullish(),
  orderNumber: z.string().max(80).nullish(),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().max(254).nullish(),
  productName: z.string().max(200).nullish(),
  quantity: z.number().int().positive().default(1),
  reason: z.string().max(2000).nullish(),
  status: ReturnStatusEnum.optional(),
  refundAmount: z.number().nonnegative().nullish(),
  restocked: z.number().int().min(0).max(1).optional(),
  notes: z.string().max(4000).nullish(),
});

const UpdateReturnBodySchema = CreateReturnBodySchema.partial();

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

function generateReturnNumber(): string {
  const ts = Date.now().toString(16).padStart(8, "0").toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `RET-${ts}-${rand}`;
}

router.get("/returns", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const all = await db
    .select()
    .from(returnsTable)
    .where(eq(returnsTable.userId, user.id))
    .orderBy(returnsTable.createdAt);
  res.json(all.reverse());
});

router.post("/returns", async (req, res): Promise<void> => {
  const parsed = CreateReturnBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { refundAmount, ...rest } = parsed.data;
  const [ret] = await db
    .insert(returnsTable)
    .values({
      userId: user.id,
      returnNumber: generateReturnNumber(),
      customerName: rest.customerName,
      customerEmail: rest.customerEmail ?? null,
      orderId: rest.orderId ?? null,
      orderNumber: rest.orderNumber ?? null,
      productName: rest.productName ?? null,
      quantity: rest.quantity ?? 1,
      reason: rest.reason ?? null,
      status: rest.status ?? "requested",
      refundAmount: refundAmount != null ? String(refundAmount) : null,
      restocked: rest.restocked ?? 0,
      notes: rest.notes ?? null,
    })
    .returning();
  res.status(201).json(ret);
});

router.patch("/returns/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReturnBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { refundAmount, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = {
    ...rest,
    updatedAt: new Date(),
  };
  if (refundAmount !== undefined) {
    updateData.refundAmount =
      refundAmount != null ? String(refundAmount) : null;
  }
  const [updated] = await db
    .update(returnsTable)
    .set(updateData)
    .where(
      and(
        eq(returnsTable.id, params.data.id),
        eq(returnsTable.userId, user.id),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/returns/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  await db
    .delete(returnsTable)
    .where(
      and(
        eq(returnsTable.id, params.data.id),
        eq(returnsTable.userId, user.id),
      ),
    );
  res.json({ success: true });
});

export default router;
