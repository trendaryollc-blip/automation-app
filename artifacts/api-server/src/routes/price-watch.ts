import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import { db, priceWatchTable, priceSnapshotsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/price-watch", async (_req, res): Promise<void> => {
  const watches = await db
    .select()
    .from(priceWatchTable)
    .orderBy(desc(priceWatchTable.createdAt));

  const result = await Promise.all(
    watches.map(async (w) => {
      const [latest] = await db
        .select({
          price: priceSnapshotsTable.price,
          recordedAt: priceSnapshotsTable.recordedAt,
        })
        .from(priceSnapshotsTable)
        .where(eq(priceSnapshotsTable.watchId, w.id))
        .orderBy(desc(priceSnapshotsTable.recordedAt))
        .limit(1);

      const [cnt] = await db
        .select({ total: count() })
        .from(priceSnapshotsTable)
        .where(eq(priceSnapshotsTable.watchId, w.id));

      return {
        ...w,
        myPrice: w.myPrice != null ? Number(w.myPrice) : null,
        latestPrice: latest ? Number(latest.price) : null,
        latestRecordedAt: latest ? latest.recordedAt.toISOString() : null,
        snapshotCount: Number(cnt?.total ?? 0),
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

router.post("/price-watch", async (req, res): Promise<void> => {
  const { name, url, myPrice, notes } = req.body as {
    name: string;
    url: string;
    myPrice?: number | null;
    notes?: string | null;
  };

  if (!name || !url) {
    res.status(400).json({ error: "name and url are required" });
    return;
  }

  const [created] = await db
    .insert(priceWatchTable)
    .values({
      name,
      url,
      myPrice: myPrice != null ? String(myPrice) : null,
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(priceWatchTable).where(eq(priceWatchTable.id, id));
  res.status(204).send();
});

router.get("/price-watch/:id/snapshots", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const snapshots = await db
    .select()
    .from(priceSnapshotsTable)
    .where(eq(priceSnapshotsTable.watchId, id))
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { price, note } = req.body as { price: number; note?: string | null };
  if (price == null || isNaN(Number(price))) {
    res.status(400).json({ error: "price is required" });
    return;
  }

  const [snap] = await db
    .insert(priceSnapshotsTable)
    .values({ watchId: id, price: String(price), note: note ?? null })
    .returning();

  // bump updatedAt on the watch
  await db
    .update(priceWatchTable)
    .set({ updatedAt: sql`now()` })
    .where(eq(priceWatchTable.id, id));

  res.status(201).json({
    ...snap,
    price: Number(snap.price),
    recordedAt: snap.recordedAt.toISOString(),
  });
});

export default router;
