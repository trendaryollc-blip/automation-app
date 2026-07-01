import { Router, type IRouter } from "express";
import { eq, desc, and, type SQL } from "drizzle-orm";
import { z } from "zod/v4";
import { db, productsTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Local Zod schemas (used for CSV import rows and for routes that don't yet
// have a generated OpenAPI body schema in @workspace/api-zod).
// ---------------------------------------------------------------------------

const ProductStatusEnum = z.enum([
  "hunting",
  "sourcing",
  "sampled",
  "listed",
  "paused",
  "archived",
]);

const ListProductsQuerySchema = z.object({
  status: ProductStatusEnum.optional(),
});

const CreateProductBodySchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(80).nullish(),
  niche: z.string().max(80).nullish(),
  status: ProductStatusEnum.optional(),
  costPrice: z.number().nonnegative().nullish(),
  sellPrice: z.number().nonnegative().nullish(),
  description: z.string().max(8000).nullish(),
  aiDescription: z.string().max(8000).nullish(),
  imageUrl: z.string().url().max(2000).nullish(),
  sourceUrl: z.string().url().max(2000).nullish(),
  notes: z.string().max(4000).nullish(),
  supplierId: z.number().int().positive().nullish(),
  stockQuantity: z.number().int().nonnegative().nullish(),
  stockThreshold: z.number().int().nonnegative().nullish(),
});

const UpdateProductBodySchema = CreateProductBodySchema.partial();

const ImportRowSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullish(),
  niche: z.string().nullish(),
  status: ProductStatusEnum.optional(),
  costPrice: z.union([z.number(), z.string()]).nullish(),
  sellPrice: z.union([z.number(), z.string()]).nullish(),
  description: z.string().nullish(),
  sourceUrl: z.string().nullish(),
  stockQuantity: z.union([z.number(), z.string()]).nullish(),
  stockThreshold: z.union([z.number(), z.string()]).nullish(),
  notes: z.string().nullish(),
});

const ImportBodySchema = z.object({
  rows: z.array(ImportRowSchema).min(1).max(10_000),
});

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

const formatProduct = (p: typeof productsTable.$inferSelect) => ({
  ...p,
  costPrice: p.costPrice != null ? Number(p.costPrice) : null,
  sellPrice: p.sellPrice != null ? Number(p.sellPrice) : null,
  margin:
    p.costPrice != null && p.sellPrice != null && Number(p.sellPrice) > 0
      ? Math.round(
          ((Number(p.sellPrice) - Number(p.costPrice)) / Number(p.sellPrice)) *
            100,
        )
      : null,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const filters: SQL[] = [eq(productsTable.userId, user.id)];
  if (parsed.data.status) {
    filters.push(eq(productsTable.status, parsed.data.status));
  }
  const products = await db
    .select()
    .from(productsTable)
    .where(and(...filters))
    .orderBy(desc(productsTable.createdAt));
  res.json(products.map(formatProduct));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { costPrice, sellPrice, ...rest } = parsed.data;
  const [product] = await db
    .insert(productsTable)
    .values({
      ...rest,
      userId: user.id,
      costPrice: costPrice != null ? String(costPrice) : undefined,
      sellPrice: sellPrice != null ? String(sellPrice) : undefined,
    })
    .returning();
  res.status(201).json(formatProduct(product));
});

router.get("/products/stock-alerts", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.userId, user.id));

  const alerts = products
    .filter(
      (p) =>
        p.stockQuantity != null &&
        p.stockThreshold != null &&
        p.stockQuantity < p.stockThreshold,
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      stockQuantity: p.stockQuantity!,
      stockThreshold: p.stockThreshold!,
      deficit: p.stockThreshold! - p.stockQuantity!,
    }))
    .sort((a, b) => b.deficit - a.deficit);

  res.json(alerts);
});

router.get("/products/trending", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.userId, user.id),
        eq(productsTable.status, "listed"),
      ),
    )
    .orderBy(desc(productsTable.sellPrice))
    .limit(10);
  const result = products
    .map((p) => {
      const cost = p.costPrice != null ? Number(p.costPrice) : null;
      const sell = p.sellPrice != null ? Number(p.sellPrice) : null;
      const margin =
        cost != null && sell != null && sell > 0
          ? Math.round(((sell - cost) / sell) * 100)
          : null;
      return {
        ...p,
        costPrice: cost,
        sellPrice: sell,
        margin,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    })
    .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0));
  res.json(result);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, params.data.id),
        eq(productsTable.userId, user.id),
      ),
    );
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(product));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { costPrice, sellPrice, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (costPrice !== undefined)
    updateData.costPrice = costPrice != null ? String(costPrice) : null;
  if (sellPrice !== undefined)
    updateData.sellPrice = sellPrice != null ? String(sellPrice) : null;

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(
      and(
        eq(productsTable.id, params.data.id),
        eq(productsTable.userId, user.id),
      ),
    )
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(product));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [product] = await db
    .delete(productsTable)
    .where(
      and(
        eq(productsTable.id, params.data.id),
        eq(productsTable.userId, user.id),
      ),
    )
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/products/import", async (req, res): Promise<void> => {
  const parsed = ImportBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { rows } = parsed.data;
  const imported: number[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const costPrice =
        row.costPrice != null && row.costPrice !== ""
          ? String(Number(row.costPrice))
          : undefined;
      const sellPrice =
        row.sellPrice != null && row.sellPrice !== ""
          ? String(Number(row.sellPrice))
          : undefined;
      const [product] = await db
        .insert(productsTable)
        .values({
          userId: user.id,
          name: row.name,
          category: row.category ?? undefined,
          niche: row.niche ?? undefined,
          status: row.status ?? "hunting",
          costPrice,
          sellPrice,
          description: row.description ?? undefined,
          sourceUrl: row.sourceUrl ?? undefined,
          stockQuantity:
            row.stockQuantity != null ? Number(row.stockQuantity) : undefined,
          stockThreshold:
            row.stockThreshold != null ? Number(row.stockThreshold) : undefined,
          notes: row.notes ?? undefined,
        })
        .returning();
      imported.push(product.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Insert failed";
      errors.push({ row: i + 1, error: msg });
    }
  }

  res.status(200).json({ imported: imported.length, errors });
});

router.post(
  "/products/:id/generate-description",
  async (req, res): Promise<void> => {
    const params = IdParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = currentUser(req);
    const [product] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, params.data.id),
          eq(productsTable.userId, user.id),
        ),
      );
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const name = product.name;
    const category = product.category ?? "general";
    const niche = product.niche ?? category;
    const sellPrice =
      product.sellPrice != null
        ? `$${Number(product.sellPrice).toFixed(2)}`
        : "";

    let aiDescription: string;
    try {
      const { generateDescription } = await import("../services/ai.js");
      aiDescription = await generateDescription(
        name,
        category,
        niche,
        sellPrice || undefined,
      );
      aiDescription = aiDescription.trim();
    } catch {
      aiDescription = `Discover the ${name} — a must-have for ${niche} enthusiasts. ${
        product.description ? product.description + " " : ""
      }Crafted for quality and performance, this ${category} product delivers exceptional value${sellPrice ? ` at just ${sellPrice}` : ""}. Whether you're a seasoned buyer or exploring for the first time, the ${name} offers everything you need to elevate your experience. Fast shipping, reliable quality, and unmatched satisfaction guaranteed.`;
    }

    const [updated] = await db
      .update(productsTable)
      .set({ aiDescription })
      .where(
        and(
          eq(productsTable.id, params.data.id),
          eq(productsTable.userId, user.id),
        ),
      )
      .returning();

    res.json(formatProduct(updated));
  },
);

export default router;
