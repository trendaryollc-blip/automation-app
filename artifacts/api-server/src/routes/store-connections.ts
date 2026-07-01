import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import crypto from "node:crypto";
import { eq, desc, and } from "drizzle-orm";
import { db, storeConnectionsTable, syncLogsTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";
import { testCJDropshipping } from "../services/cjdropshipping.js";
import { testZendrop } from "../services/zendrop.js";

const router: IRouter = Router();

// NOTE: the public `/webhooks/store` endpoint is in `store-webhooks.ts` and
// is mounted separately BEFORE requireAuth in `routes/index.ts`.

function generateApiKey(): string {
  return "df_" + crypto.randomBytes(24).toString("hex");
}

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

const CreateConnectionBodySchema = z.object({
  storeName: z.string().min(1).max(200),
  storeUrl: z.string().url().max(2000).nullish(),
  platform: z.string().max(80).default("custom"),
  notes: z.string().max(4000).nullish(),
  config: z.record(z.string(), z.unknown()).nullish(),
});

const UpdateConnectionBodySchema = z.object({
  storeName: z.string().min(1).max(200).optional(),
  storeUrl: z.string().url().max(2000).nullish(),
  platform: z.string().max(80).optional(),
  notes: z.string().max(4000).nullish(),
  status: z.string().max(80).optional(),
  config: z.record(z.string(), z.unknown()).nullish(),
});

router.get("/store-connections", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const connections = await db
    .select()
    .from(storeConnectionsTable)
    .where(eq(storeConnectionsTable.userId, user.id))
    .orderBy(desc(storeConnectionsTable.createdAt));
  res.json(
    connections.map((c) => ({
      ...c,
      config: c.config ? JSON.parse(c.config) : null,
    })),
  );
});

router.post("/store-connections", async (req, res): Promise<void> => {
  const parsed = CreateConnectionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { storeName, storeUrl, platform, notes, config } = parsed.data;
  const apiKey = generateApiKey();
  const [conn] = await db
    .insert(storeConnectionsTable)
    .values({
      userId: user.id,
      storeName,
      storeUrl: storeUrl ?? null,
      platform: platform ?? "custom",
      apiKey,
      notes: notes ?? null,
      status: "active",
      config: config ? JSON.stringify(config) : null,
    })
    .returning();
  res.status(201).json({
    ...conn,
    config: conn.config ? JSON.parse(conn.config) : null,
  });
});

router.patch("/store-connections/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateConnectionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { config, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = {
    ...rest,
    updatedAt: new Date(),
  };
  if (config !== undefined) {
    updateData.config = config ? JSON.stringify(config) : null;
  }
  const [updated] = await db
    .update(storeConnectionsTable)
    .set(updateData)
    .where(
      and(
        eq(storeConnectionsTable.id, params.data.id),
        eq(storeConnectionsTable.userId, user.id),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    ...updated,
    config: updated.config ? JSON.parse(updated.config) : null,
  });
});

router.delete("/store-connections/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  await db
    .delete(storeConnectionsTable)
    .where(
      and(
        eq(storeConnectionsTable.id, params.data.id),
        eq(storeConnectionsTable.userId, user.id),
      ),
    );
  res.json({ success: true });
});

router.get("/store-connections/:id/logs", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  // Verify ownership before returning logs.
  const [owned] = await db
    .select({ id: storeConnectionsTable.id })
    .from(storeConnectionsTable)
    .where(
      and(
        eq(storeConnectionsTable.id, params.data.id),
        eq(storeConnectionsTable.userId, user.id),
      ),
    )
    .limit(1);
  if (!owned) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const logs = await db
    .select()
    .from(syncLogsTable)
    .where(eq(syncLogsTable.storeConnectionId, params.data.id))
    .orderBy(desc(syncLogsTable.createdAt))
    .limit(50);
  res.json(logs);
});

router.post(
  "/store-connections/:id/regenerate-key",
  async (req, res): Promise<void> => {
    const params = IdParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = currentUser(req);
    const newKey = generateApiKey();
    const [updated] = await db
      .update(storeConnectionsTable)
      .set({ apiKey: newKey, updatedAt: new Date() })
      .where(
        and(
          eq(storeConnectionsTable.id, params.data.id),
          eq(storeConnectionsTable.userId, user.id),
        ),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.post("/store-connections/:id/test", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [conn] = await db
    .select()
    .from(storeConnectionsTable)
    .where(
      and(
        eq(storeConnectionsTable.id, params.data.id),
        eq(storeConnectionsTable.userId, user.id),
      ),
    );
  if (!conn) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    const config = conn.config
      ? (JSON.parse(conn.config) as Record<string, unknown>)
      : null;
    const platform = conn.platform;

    if (platform === "cjdropshipping") {
      const result = await testCJDropshipping(config);
      res.json(result);
      return;
    }
    if (platform === "zendrop") {
      const result = await testZendrop(config);
      res.json(result);
      return;
    }

    res.json({ ok: true, message: "Custom webhook test not implemented" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ ok: false, error: msg });
  }
});

export default router;
