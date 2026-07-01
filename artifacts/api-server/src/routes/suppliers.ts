import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod/v4";
import { db, suppliersTable, productsTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Local Zod schemas
// ---------------------------------------------------------------------------

const ListSuppliersQuerySchema = z.object({
  country: z.string().max(80).optional(),
});

const CreateSupplierBodySchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().max(80).nullish(),
  rating: z.number().min(0).max(5).nullish(),
  minOrder: z.number().int().nonnegative().nullish(),
  shippingDays: z.number().int().nonnegative().nullish(),
  website: z.string().url().max(2000).nullish(),
  contactEmail: z.string().email().max(254).nullish(),
  notes: z.string().max(4000).nullish(),
});

const UpdateSupplierBodySchema = CreateSupplierBodySchema.partial();

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

const formatSupplier = (s: typeof suppliersTable.$inferSelect) => ({
  ...s,
  rating: s.rating != null ? Number(s.rating) : null,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});

router.get("/suppliers", async (req, res): Promise<void> => {
  const parsed = ListSuppliersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  let query = db.select().from(suppliersTable).$dynamic();
  query = query.where(eq(suppliersTable.userId, user.id));
  if (parsed.data.country) {
    query = query.where(eq(suppliersTable.country, parsed.data.country));
  }
  const suppliers = await query.orderBy(desc(suppliersTable.createdAt));
  res.json(suppliers.map(formatSupplier));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const parsed = CreateSupplierBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { rating, ...rest } = parsed.data;
  const [supplier] = await db
    .insert(suppliersTable)
    .values({
      ...rest,
      userId: user.id,
      rating: rating != null ? String(rating) : undefined,
    })
    .returning();
  res.status(201).json(formatSupplier(supplier));
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(
      and(
        eq(suppliersTable.id, params.data.id),
        eq(suppliersTable.userId, user.id),
      ),
    );
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.json(formatSupplier(supplier));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSupplierBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { rating, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (rating !== undefined)
    updateData.rating = rating != null ? String(rating) : null;

  const [supplier] = await db
    .update(suppliersTable)
    .set(updateData)
    .where(
      and(
        eq(suppliersTable.id, params.data.id),
        eq(suppliersTable.userId, user.id),
      ),
    )
    .returning();
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.json(formatSupplier(supplier));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [supplier] = await db
    .delete(suppliersTable)
    .where(
      and(
        eq(suppliersTable.id, params.data.id),
        eq(suppliersTable.userId, user.id),
      ),
    )
    .returning();
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/suppliers/:id/products", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.supplierId, params.data.id),
        eq(productsTable.userId, user.id),
      ),
    )
    .orderBy(desc(productsTable.createdAt));
  const result = products.map((p) => ({
    ...p,
    costPrice: p.costPrice != null ? Number(p.costPrice) : null,
    sellPrice: p.sellPrice != null ? Number(p.sellPrice) : null,
    margin:
      p.costPrice != null && p.sellPrice != null && Number(p.sellPrice) > 0
        ? Math.round(
            ((Number(p.sellPrice) - Number(p.costPrice)) /
              Number(p.sellPrice)) *
              100,
          )
        : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
  res.json(result);
});

export default router;
