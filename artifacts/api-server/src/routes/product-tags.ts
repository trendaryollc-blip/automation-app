import { Router } from "express";
import { db } from "@workspace/db";
import { productTagsTable, productTagLinksTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

router.get("/product-tags", async (req, res) => {
  const tags = await db
    .select()
    .from(productTagsTable)
    .orderBy(productTagsTable.name);
  res.json(tags);
});

router.post("/product-tags", async (req, res) => {
  const [tag] = await db.insert(productTagsTable).values(req.body).returning();
  res.status(201).json(tag);
});

router.delete("/product-tags/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db
    .delete(productTagLinksTable)
    .where(eq(productTagLinksTable.tagId, id));
  await db.delete(productTagsTable).where(eq(productTagsTable.id, id));
  res.json({ success: true });
});

router.get("/products/:id/tags", async (req, res) => {
  const productId = parseInt(req.params.id);
  const links = await db
    .select()
    .from(productTagLinksTable)
    .where(eq(productTagLinksTable.productId, productId));
  if (links.length === 0) {
    res.json([]);
    return;
  }
  const tags = await db
    .select()
    .from(productTagsTable)
    .where(
      inArray(
        productTagsTable.id,
        links.map((l) => l.tagId),
      ),
    );
  res.json(tags);
});

router.post("/products/:id/tags", async (req, res) => {
  const productId = parseInt(req.params.id);
  const { tagId } = req.body;
  await db
    .insert(productTagLinksTable)
    .values({ productId, tagId })
    .onConflictDoNothing();
  res.status(201).json({ productId, tagId });
});

router.delete("/products/:id/tags/:tagId", async (req, res) => {
  const productId = parseInt(req.params.id);
  const tagId = parseInt(req.params.tagId);
  await db
    .delete(productTagLinksTable)
    .where(eq(productTagLinksTable.productId, productId));
  res.json({ success: true });
});

export default router;
