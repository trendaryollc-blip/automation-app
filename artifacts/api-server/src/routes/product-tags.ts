import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, inArray, and } from "drizzle-orm";
import { db, productTagsTable, productTagLinksTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const CreateTagBodySchema = z.object({
  name: z.string().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });
const ProductIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
const LinkBodySchema = z.object({ tagId: z.number().int().positive() });

router.get("/product-tags", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const tags = await db
    .select()
    .from(productTagsTable)
    .where(eq(productTagsTable.userId, user.id))
    .orderBy(productTagsTable.name);
  res.json(tags);
});

router.post("/product-tags", async (req, res): Promise<void> => {
  const parsed = CreateTagBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const [tag] = await db
    .insert(productTagsTable)
    .values({
      userId: user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? "#818cf8",
    })
    .returning();
  res.status(201).json(tag);
});

router.delete("/product-tags/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  // Verify ownership before cascading delete.
  const [owned] = await db
    .select({ id: productTagsTable.id })
    .from(productTagsTable)
    .where(
      and(
        eq(productTagsTable.id, params.data.id),
        eq(productTagsTable.userId, user.id),
      ),
    )
    .limit(1);
  if (!owned) {
    res.status(404).json({ error: "Tag not found" });
    return;
  }
  await db
    .delete(productTagLinksTable)
    .where(eq(productTagLinksTable.tagId, params.data.id));
  await db
    .delete(productTagsTable)
    .where(eq(productTagsTable.id, params.data.id));
  res.json({ success: true });
});

router.get("/products/:id/tags", async (req, res): Promise<void> => {
  const params = ProductIdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const links = await db
    .select()
    .from(productTagLinksTable)
    .where(eq(productTagLinksTable.productId, params.data.id));
  if (links.length === 0) {
    res.json([]);
    return;
  }
  const tagIds = links.map((l) => l.tagId);
  const tags = await db
    .select()
    .from(productTagsTable)
    .where(
      and(
        inArray(productTagsTable.id, tagIds),
        eq(productTagsTable.userId, user.id),
      ),
    );
  res.json(tags);
});

router.post("/products/:id/tags", async (req, res): Promise<void> => {
  const params = ProductIdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = LinkBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  // Verify the tag belongs to this user before linking.
  const [owned] = await db
    .select({ id: productTagsTable.id })
    .from(productTagsTable)
    .where(
      and(
        eq(productTagsTable.id, parsed.data.tagId),
        eq(productTagsTable.userId, user.id),
      ),
    )
    .limit(1);
  if (!owned) {
    res.status(404).json({ error: "Tag not found" });
    return;
  }
  await db
    .insert(productTagLinksTable)
    .values({ productId: params.data.id, tagId: parsed.data.tagId })
    .onConflictDoNothing();
  res.status(201).json({ productId: params.data.id, tagId: parsed.data.tagId });
});

router.delete("/products/:id/tags/:tagId", async (req, res): Promise<void> => {
  const params = z
    .object({
      id: z.coerce.number().int().positive(),
      tagId: z.coerce.number().int().positive(),
    })
    .safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  // Only delete if the tag is owned by this user.
  const [owned] = await db
    .select({ id: productTagsTable.id })
    .from(productTagsTable)
    .where(
      and(
        eq(productTagsTable.id, params.data.tagId),
        eq(productTagsTable.userId, user.id),
      ),
    )
    .limit(1);
  if (!owned) {
    res.status(404).json({ error: "Tag not found" });
    return;
  }
  await db
    .delete(productTagLinksTable)
    .where(
      and(
        eq(productTagLinksTable.productId, params.data.id),
        eq(productTagLinksTable.tagId, params.data.tagId),
      ),
    );
  res.json({ success: true });
});

export default router;
