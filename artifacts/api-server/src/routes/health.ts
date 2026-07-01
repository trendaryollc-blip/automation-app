import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, getDb, getDbMode } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const startedAt = new Date();

/**
 * Liveness probe — answers "is the process up?".  Used by Vercel,
 * Kubernetes, and uptime monitors.  Never touches the database so
 * it stays fast and never cascades a DB outage into a "service is
 * down" alert.
 */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * Readiness probe — answers "can the service actually handle
 * requests right now?".  Performs a fast DB round-trip and reports
 * per-subsystem health.  Returns 503 if the database is unreachable
 * so load balancers can take this instance out of rotation.
 */
router.get("/readyz", async (_req, res) => {
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> =
    {};
  let ok = true;

  // 1) Database round-trip
  const dbStart = Date.now();
  try {
    if (getDbMode() === "firestore" || getDb() === null) {
      // For Firestore mode we don't ping here (Firestore's getFirestore
      // is a lazy client).  Report it as unknown but ok.
      checks["database"] = { ok: true };
    } else {
      await db.execute(sql`SELECT 1`);
      checks["database"] = { ok: true, ms: Date.now() - dbStart };
    }
  } catch (err) {
    ok = false;
    checks["database"] = {
      ok: false,
      ms: Date.now() - dbStart,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 2) Process info
  const mem = process.memoryUsage();
  checks["process"] = {
    ok: true,
    // (memory is reported via headers / log; we don't put it in
    // the JSON to keep the response small for monitors.)
  };

  const body = {
    status: ok ? "ok" : "degraded",
    uptimeSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
    version: process.env["npm_package_version"] || "0.0.0",
    dbMode: getDbMode(),
    node: process.version,
    memoryRssMb: Math.round(mem.rss / 1024 / 1024),
    checks,
  };
  res.status(ok ? 200 : 503).json(body);
});

export default router;
