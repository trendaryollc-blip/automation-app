import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, suppliersTable, productsTable } from "@workspace/db";
import {
  ListSuppliersQueryParams,
  CreateSupplierBody,
  GetSupplierParams,
  UpdateSupplierParams,
  UpdateSupplierBody,
  DeleteSupplierParams,
  GetSupplierProductsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const formatSupplier = (s: typeof suppliersTable.$inferSelect) => ({
  ...s,
  rating: s.rating != null ? Number(s.rating) : null,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});

router.get("/suppliers", async (req, res): Promise<void> => {
  const parsed = ListSuppliersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let query = db.select().from(suppliersTable).$dynamic();
  if (parsed.data.country) {
    query = query.where(eq(suppliersTable.country, parsed.data.country));
  }
  const suppliers = await query.orderBy(desc(suppliersTable.createdAt));
  res.json(suppliers.map(formatSupplier));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { rating, ...rest } = parsed.data;
  const [supplier] = await db
    .insert(suppliersTable)
    .values({ ...rest, rating: rating != null ? String(rating) : undefined })
    .returning();
  res.status(201).json(formatSupplier(supplier));
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const params = GetSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, params.data.id));
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.json(formatSupplier(supplier));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const params = UpdateSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { rating, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (rating !== undefined) updateData.rating = rating != null ? String(rating) : null;

  const [supplier] = await db
    .update(suppliersTable)
    .set(updateData)
    .where(eq(suppliersTable.id, params.data.id))
    .returning();
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.json(formatSupplier(supplier));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const params = DeleteSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [supplier] = await db
    .delete(suppliersTable)
    .where(eq(suppliersTable.id, params.data.id))
    .returning();
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/suppliers/:id/products", async (req, res): Promise<void> => {
  const params = GetSupplierProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.supplierId, params.data.id))
    .orderBy(desc(productsTable.createdAt));
  const result = products.map((p) => ({
    ...p,
    costPrice: p.costPrice != null ? Number(p.costPrice) : null,
    sellPrice: p.sellPrice != null ? Number(p.sellPrice) : null,
    margin:
      p.costPrice != null && p.sellPrice != null && Number(p.sellPrice) > 0
        ? Math.round(((Number(p.sellPrice) - Number(p.costPrice)) / Number(p.sellPrice)) * 100)
        : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
  res.json(result);
});

export default router;
