import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db, promotionsTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const PromotionTypeEnum = z.enum([
  "percentage",
  "fixed",
  "free_shipping",
  "bogo",
]);

const PromotionStatusEnum = z.enum([
  "draft",
  "active",
  "paused",
  "expired",
  "archived",
]);

const CreatePromotionBodySchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(80).nullish(),
  type: PromotionTypeEnum.optional(),
  value: z.number().nonnegative(),
  productId: z.number().int().positive().nullish(),
  productName: z.string().max(200).nullish(),
  status: PromotionStatusEnum.optional(),
  startDate: z.union([z.string(), z.date()]).nullish(),
  endDate: z.union([z.string(), z.date()]).nullish(),
  usageCount: z.number().int().nonnegative().optional(),
  revenueImpact: z.number().nonnegative().nullish(),
  notes: z.string().max(4000).nullish(),
});

const UpdatePromotionBodySchema = CreatePromotionBodySchema.partial();

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

router.get("/promotions", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const all = await db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.userId, user.id))
    .orderBy(promotionsTable.createdAt);
  res.json(all.reverse());
});

router.post("/promotions", async (req, res): Promise<void> => {
  const parsed = CreatePromotionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { value, revenueImpact, startDate, endDate, ...rest } = parsed.data;
  const [promo] = await db
    .insert(promotionsTable)
    .values({
      userId: user.id,
      name: rest.name,
      code: rest.code ?? null,
      type: rest.type ?? "percentage",
      value: String(value),
      productId: rest.productId ?? null,
      productName: rest.productName ?? null,
      status: rest.status ?? "active",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      usageCount: rest.usageCount ?? 0,
      revenueImpact: revenueImpact != null ? String(revenueImpact) : null,
      notes: rest.notes ?? null,
    })
    .returning();
  res.status(201).json(promo);
});

router.patch("/promotions/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePromotionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.value !== undefined) {
    updateData.value = String(parsed.data.value);
  }
  if (parsed.data.revenueImpact !== undefined) {
    updateData.revenueImpact =
      parsed.data.revenueImpact != null ? String(parsed.data.revenueImpact) : null;
  }
  if (parsed.data.startDate !== undefined) {
    updateData.startDate =
      parsed.data.startDate != null ? new Date(parsed.data.startDate) : null;
  }
  if (parsed.data.endDate !== undefined) {
    updateData.endDate =
      parsed.data.endDate != null ? new Date(parsed.data.endDate) : null;
  }
  const [updated] = await db
    .update(promotionsTable)
    .set(updateData)
    .where(
      and(
        eq(promotionsTable.id, params.data.id),
        eq(promotionsTable.userId, user.id),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/promotions/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  await db
    .delete(promotionsTable)
    .where(
      and(
        eq(promotionsTable.id, params.data.id),
        eq(promotionsTable.userId, user.id),
      ),
    );
  res.json({ success: true });
});

export default router;
