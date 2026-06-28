import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { launchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_STEPS = [
  { key: "source", title: "Source & sample product from supplier", status: "pending", notes: "" },
  { key: "listing", title: "Create product listing on store", status: "pending", notes: "" },
  { key: "pricing", title: "Set pricing & margin target", status: "pending", notes: "" },
  { key: "creatives", title: "Create ad creatives (images/video)", status: "pending", notes: "" },
  { key: "ads", title: "Launch ads on small test budget ($20–50)", status: "pending", notes: "" },
  { key: "monitor", title: "Monitor first 48h metrics (ROAS, CTR)", status: "pending", notes: "" },
  { key: "decision", title: "Scale or kill decision based on data", status: "pending", notes: "" },
];

router.get("/launches", async (_req, res) => {
  const all = await db.select().from(launchesTable).orderBy(launchesTable.createdAt);
  res.json(all.reverse());
});

router.post("/launches", async (req, res) => {
  const { productName, productId, targetLaunchDate, notes } = req.body as {
    productName?: string; productId?: number; targetLaunchDate?: string; notes?: string;
  };
  if (!productName) { res.status(400).json({ error: "productName is required" }); return; }
  const [launch] = await db.insert(launchesTable).values({
    productName,
    productId: productId ?? null,
    targetLaunchDate: targetLaunchDate ? new Date(targetLaunchDate) : null,
    notes: notes ?? null,
    steps: DEFAULT_STEPS,
    status: "planning",
  }).returning();
  res.status(201).json(launch);
});

router.patch("/launches/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [updated] = await db.update(launchesTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(launchesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/launches/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(launchesTable).where(eq(launchesTable.id, id));
  res.json({ success: true });
});

export default router;
