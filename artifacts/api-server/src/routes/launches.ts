import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db, launchesTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const LaunchStatusEnum = z.enum([
  "planning",
  "sourcing",
  "creative",
  "live",
  "paused",
  "killed",
  "completed",
]);

const CreateLaunchBodySchema = z.object({
  productName: z.string().min(1).max(200),
  productId: z.number().int().positive().nullish(),
  status: LaunchStatusEnum.optional(),
  targetLaunchDate: z.union([z.string(), z.date()]).nullish(),
  notes: z.string().max(4000).nullish(),
});

const UpdateLaunchBodySchema = CreateLaunchBodySchema.partial();

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

const DEFAULT_STEPS = [
  {
    key: "source",
    title: "Source & sample product from supplier",
    status: "pending",
    notes: "",
  },
  {
    key: "listing",
    title: "Create product listing on store",
    status: "pending",
    notes: "",
  },
  {
    key: "pricing",
    title: "Set pricing & margin target",
    status: "pending",
    notes: "",
  },
  {
    key: "creatives",
    title: "Create ad creatives (images/video)",
    status: "pending",
    notes: "",
  },
  {
    key: "ads",
    title: "Launch ads on small test budget ($20–50)",
    status: "pending",
    notes: "",
  },
  {
    key: "monitor",
    title: "Monitor first 48h metrics (ROAS, CTR)",
    status: "pending",
    notes: "",
  },
  {
    key: "decision",
    title: "Scale or kill decision based on data",
    status: "pending",
    notes: "",
  },
];

router.get("/launches", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const all = await db
    .select()
    .from(launchesTable)
    .where(eq(launchesTable.userId, user.id))
    .orderBy(launchesTable.createdAt);
  res.json(all.reverse());
});

function friendlyZodError(
  error: unknown,
  fieldMessages?: Record<string, string>,
): string {
  const issues =
    (error as { issues?: { path?: unknown[]; message?: string }[] })?.issues ??
    [];
  const first = issues[0];
  if (first && fieldMessages) {
    const fieldName = String(first.path?.[0] ?? "");
    if (fieldMessages[fieldName]) return fieldMessages[fieldName];
  }
  if (first) {
    const fieldName = String(first.path?.[0] ?? "");
    return fieldName
      ? `${fieldName} ${first.message ?? "is invalid"}`
      : (first.message ?? "Validation failed");
  }
  return "Validation failed";
}

router.post("/launches", async (req, res): Promise<void> => {
  const parsed = CreateLaunchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: friendlyZodError(parsed.error, {
        productName: "productName is required",
      }),
    });
    return;
  }
  const user = currentUser(req);
  const { productName, productId, targetLaunchDate, notes, status } =
    parsed.data;
  const [launch] = await db
    .insert(launchesTable)
    .values({
      userId: user.id,
      productName,
      productId: productId ?? null,
      targetLaunchDate: targetLaunchDate ? new Date(targetLaunchDate) : null,
      notes: notes ?? null,
      steps: DEFAULT_STEPS,
      status: status ?? "planning",
    })
    .returning();
  res.status(201).json(launch);
});

router.patch("/launches/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLaunchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { targetLaunchDate, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = {
    ...rest,
    updatedAt: new Date(),
  };
  if (targetLaunchDate !== undefined) {
    updateData.targetLaunchDate =
      targetLaunchDate != null ? new Date(targetLaunchDate) : null;
  }
  const [updated] = await db
    .update(launchesTable)
    .set(updateData)
    .where(
      and(
        eq(launchesTable.id, params.data.id),
        eq(launchesTable.userId, user.id),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/launches/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  await db
    .delete(launchesTable)
    .where(
      and(
        eq(launchesTable.id, params.data.id),
        eq(launchesTable.userId, user.id),
      ),
    );
  res.json({ success: true });
});

export default router;
