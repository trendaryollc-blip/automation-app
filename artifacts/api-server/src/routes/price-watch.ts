import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, desc, and } from "drizzle-orm";
import { db, priceWatchTable, priceSnapshotsTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const CreatePriceWatchBodySchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  myPrice: z.number().nonnegative().nullish(),
  notes: z.string().max(4000).nullish(),
  productId: z.union([z.number(), z.string()]).nullish(),
  targetPrice: z.union([z.number(), z.string()]).nullish(),
});

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

const SnapshotBodySchema = z.object({
  price: z.number().nonnegative(),
  note: z.string().max(2000).nullish(),
});

router.get("/price-watch", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const watches = await db
    .select()
    .from(priceWatchTable)
    .where(eq(priceWatchTable.userId, user.id))
    .orderBy(desc(priceWatchTable.createdAt));

  const result = await Promise.all(
    watches.map(async (w) => {
      const [latest] = await db
        .select({
          price: priceSnapshotsTable.price,
          recordedAt: priceSnapshotsTable.recordedAt,
        })
        .from(priceSnapshotsTable)
        .where(
          and(
            eq(priceSnapshotsTable.watchId, w.id),
            eq(priceSnapshotsTable.userId, user.id),
          ),
        )
        .orderBy(desc(priceSnapshotsTable.recordedAt))
        .limit(1);

      const snapshots = await db
        .select()
        .from(priceSnapshotsTable)
        .where(
          and(
            eq(priceSnapshotsTable.watchId, w.id),
            eq(priceSnapshotsTable.userId, user.id),
          ),
        );

      return {
        ...w,
        myPrice: w.myPrice != null ? Number(w.myPrice) : null,
        latestPrice: latest ? Number(latest.price) : null,
        latestRecordedAt: latest ? latest.recordedAt.toISOString() : null,
        snapshotCount: snapshots.length,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

router.post("/price-watch", async (req, res): Promise<void> => {
  const parsed = CreatePriceWatchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { name, url, myPrice, notes, productId, targetPrice } = parsed.data;

  const normalizedName = name.trim();
  const normalizedUrl = url.trim();
  const resolvedMyPrice =
    myPrice != null
      ? String(myPrice)
      : targetPrice != null
        ? String(targetPrice)
        : null;

  const [created] = await db
    .insert(priceWatchTable)
    .values({
      userId: user.id,
      name: normalizedName,
      url: normalizedUrl,
      myPrice: resolvedMyPrice,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json({
    ...created,
    myPrice: created.myPrice != null ? Number(created.myPrice) : null,
    latestPrice: null,
    latestRecordedAt: null,
    snapshotCount: 0,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  });
});

router.delete("/price-watch/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  // Snapshots cascade via the FK in the schema.
  await db
    .delete(priceWatchTable)
    .where(
      and(
        eq(priceWatchTable.id, params.data.id),
        eq(priceWatchTable.userId, user.id),
      ),
    );
  res.status(204).send();
});

router.get("/price-watch/:id/snapshots", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const snapshots = await db
    .select()
    .from(priceSnapshotsTable)
    .where(
      and(
        eq(priceSnapshotsTable.watchId, params.data.id),
        eq(priceSnapshotsTable.userId, user.id),
      ),
    )
    .orderBy(priceSnapshotsTable.recordedAt);
  res.json(
    snapshots.map((s) => ({
      ...s,
      price: Number(s.price),
      recordedAt: s.recordedAt.toISOString(),
    })),
  );
});

router.post("/price-watch/:id/snapshots", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SnapshotBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);

  // Verify the parent watch belongs to this user before inserting the snapshot.
  const [watch] = await db
    .select({ id: priceWatchTable.id })
    .from(priceWatchTable)
    .where(
      and(
        eq(priceWatchTable.id, params.data.id),
        eq(priceWatchTable.userId, user.id),
      ),
    )
    .limit(1);
  if (!watch) {
    res.status(404).json({ error: "Price watch not found" });
    return;
  }

  const [snap] = await db
    .insert(priceSnapshotsTable)
    .values({
      userId: user.id,
      watchId: params.data.id,
      price: String(parsed.data.price),
      note: parsed.data.note ?? null,
    })
    .returning();

  // Bump the parent watch's updatedAt so the list view reflects activity.
  await db
    .update(priceWatchTable)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(priceWatchTable.id, params.data.id),
        eq(priceWatchTable.userId, user.id),
      ),
    );

  res.status(201).json({
    ...snap,
    price: Number(snap.price),
    recordedAt: snap.recordedAt.toISOString(),
  });
});

export default router;
