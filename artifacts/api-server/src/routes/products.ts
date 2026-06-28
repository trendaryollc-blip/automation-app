import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
  GenerateProductDescriptionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let query = db.select().from(productsTable).$dynamic();
  if (parsed.data.status) {
    query = query.where(eq(productsTable.status, parsed.data.status));
  }
  const products = await query.orderBy(desc(productsTable.createdAt));
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

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { costPrice, sellPrice, ...rest } = parsed.data;
  const [product] = await db
    .insert(productsTable)
    .values({
      ...rest,
      costPrice: costPrice != null ? String(costPrice) : undefined,
      sellPrice: sellPrice != null ? String(sellPrice) : undefined,
    })
    .returning();
  res.status(201).json({
    ...product,
    costPrice: product.costPrice != null ? Number(product.costPrice) : null,
    sellPrice: product.sellPrice != null ? Number(product.sellPrice) : null,
    margin:
      product.costPrice != null &&
      product.sellPrice != null &&
      Number(product.sellPrice) > 0
        ? Math.round(
            ((Number(product.sellPrice) - Number(product.costPrice)) /
              Number(product.sellPrice)) *
              100,
          )
        : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  });
});

router.get("/products/stock-alerts", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable);

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

router.get("/products/trending", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.status, "listed"))
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
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({
    ...product,
    costPrice: product.costPrice != null ? Number(product.costPrice) : null,
    sellPrice: product.sellPrice != null ? Number(product.sellPrice) : null,
    margin:
      product.costPrice != null &&
      product.sellPrice != null &&
      Number(product.sellPrice) > 0
        ? Math.round(
            ((Number(product.sellPrice) - Number(product.costPrice)) /
              Number(product.sellPrice)) *
              100,
          )
        : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  });
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { costPrice, sellPrice, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (costPrice !== undefined)
    updateData.costPrice = costPrice != null ? String(costPrice) : null;
  if (sellPrice !== undefined)
    updateData.sellPrice = sellPrice != null ? String(sellPrice) : null;

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({
    ...product,
    costPrice: product.costPrice != null ? Number(product.costPrice) : null,
    sellPrice: product.sellPrice != null ? Number(product.sellPrice) : null,
    margin:
      product.costPrice != null &&
      product.sellPrice != null &&
      Number(product.sellPrice) > 0
        ? Math.round(
            ((Number(product.sellPrice) - Number(product.costPrice)) /
              Number(product.sellPrice)) *
              100,
          )
        : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  });
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/products/import", async (req, res): Promise<void> => {
  const { rows } = req.body as { rows: Record<string, unknown>[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows must be a non-empty array" });
    return;
  }
  const imported: number[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name || typeof row.name !== "string") {
      errors.push({ row: i + 1, error: "Missing required field: name" });
      continue;
    }
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
          name: String(row.name),
          category: row.category ? String(row.category) : undefined,
          niche: row.niche ? String(row.niche) : undefined,
          status: (row.status as any) || "hunting",
          costPrice,
          sellPrice,
          description: row.description ? String(row.description) : undefined,
          sourceUrl: row.sourceUrl ? String(row.sourceUrl) : undefined,
          stockQuantity:
            row.stockQuantity != null ? Number(row.stockQuantity) : undefined,
          stockThreshold:
            row.stockThreshold != null ? Number(row.stockThreshold) : undefined,
          notes: row.notes ? String(row.notes) : undefined,
        })
        .returning();
      imported.push(product.id);
    } catch (e: any) {
      errors.push({ row: i + 1, error: e.message ?? "Insert failed" });
    }
  }

  res.status(200).json({ imported: imported.length, errors });
});

router.post(
  "/products/:id/generate-description",
  async (req, res): Promise<void> => {
    const params = GenerateProductDescriptionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, params.data.id));
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
      .where(eq(productsTable.id, params.data.id))
      .returning();

    res.json({
      ...updated,
      costPrice: updated.costPrice != null ? Number(updated.costPrice) : null,
      sellPrice: updated.sellPrice != null ? Number(updated.sellPrice) : null,
      margin:
        updated.costPrice != null &&
        updated.sellPrice != null &&
        Number(updated.sellPrice) > 0
          ? Math.round(
              ((Number(updated.sellPrice) - Number(updated.costPrice)) /
                Number(updated.sellPrice)) *
                100,
            )
          : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  },
);

export default router;
