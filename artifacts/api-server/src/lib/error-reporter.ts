/**
 * Error reporter abstraction.
 *
 * In production, the API server forwards unhandled exceptions and
 * logged errors to Sentry when SENTRY_DSN is set.  In development
 * (or when Sentry is not configured) the reporter is a no-op so the
 * app starts cleanly without external dependencies.
 *
 * The DSN format is parsed once at module load.  We do NOT pull in
 * the Sentry SDK to keep the bundle small; instead we POST a
 * minimal envelope to Sentry's HTTP endpoint, which is the public
 * ingestion API documented at:
 *   https://develop.sentry.dev/sdk/envelopes/
 *
 * For full features (breadcrumbs, performance, source maps) install
 * `@sentry/node` and replace the body of `reportError` with
 * `Sentry.captureException(err)`.  This implementation is sufficient
 * for production-quality error alerting.
 */

import { logger } from "./logger";

let enabled = false;
let ingestUrl: string | null = null;
let publicKey: string | null = null;
let projectId: string | null = null;
let release: string | undefined;

function readString(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function init(): void {
  const dsn = readString("SENTRY_DSN");
  if (!dsn) {
    enabled = false;
    return;
  }
  try {
    // Sentry DSN format: https://<key>@o<org>.ingest.sentry.io/<project>
    const u = new URL(dsn);
    if (u.protocol !== "https:") {
      logger.warn(
        { dsn },
        "[sentry] DSN must use https, error reporting disabled",
      );
      return;
    }
    publicKey = u.username;
    const m = u.pathname.match(/^\/(\d+)\/?$/);
    if (!m) {
      logger.warn(
        { dsn },
        "[sentry] DSN must end with /<projectId>, error reporting disabled",
      );
      return;
    }
    projectId = m[1];
    ingestUrl = `https://${u.host}/api/${projectId}/store/?sentry_key=${publicKey}&sentry_version=7`;
    release = readString("SENTRY_RELEASE") || readString("npm_package_version");
    enabled = true;
    logger.info(
      { host: u.host, projectId },
      "[sentry] error reporting enabled",
    );
  } catch (err) {
    logger.warn({ err }, "[sentry] failed to parse DSN, error reporting off");
  }
}

init();

/**
 * Report an unhandled error.  Never throws.
 */
export function reportError(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!enabled || !ingestUrl) return;
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const event = {
      event_id: cryptoRandomHex(32),
      timestamp: Date.now() / 1000,
      platform: "node",
      level: "error",
      logger: "api",
      transaction:
        typeof context?.["path"] === "string"
          ? (context["path"] as string)
          : undefined,
      server_name: readString("HOSTNAME") || undefined,
      release,
      environment: readString("NODE_ENV") || "development",
      tags: pickStringValues(context),
      exception: {
        values: [
          {
            type: err instanceof Error ? err.name : "Error",
            value: message,
            stacktrace: stack ? { frames: parseStack(stack) } : undefined,
          },
        ],
      },
      extra: context,
    };
    // Fire-and-forget.  We don't want a Sentry outage to slow down
    // a real request.
    void fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch((fetchErr) => {
      logger.debug({ err: fetchErr }, "[sentry] failed to send event (silent)");
    });
  } catch (innerErr) {
    logger.debug({ err: innerErr }, "[sentry] reportError failed (silent)");
  }
}

function pickStringValues(
  ctx: Record<string, unknown> | undefined,
): Record<string, string> {
  if (!ctx) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function parseStack(
  stack: string,
): { filename: string; function: string; lineno?: number; colno?: number }[] {
  return stack
    .split("\n")
    .map((line) => line.trim())
    .filter((l) => l.startsWith("at "))
    .map((l) => {
      // examples:
      //   at Object.<anonymous> (/path/file.js:10:5)
      //   at /path/file.js:10:5
      //   at fn (/path/file.ts:20:7)
      const m = l.match(/^at\s+(?:.*?\s\()?(.*?):(\d+):(\d+)\)?$/);
      if (!m) return { filename: l, function: "?" };
      return {
        filename: m[1] || "?",
        function: l.replace(/\(.*?\)$/, "").replace(/^at\s+/, "") || "?",
        lineno: Number(m[2]),
        colno: Number(m[3]),
      };
    })
    .slice(0, 50);
}

function cryptoRandomHex(bytes: number): string {
  // Lazy require so test envs without crypto don't fail at import.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { randomBytes } =
    require("node:crypto") as typeof import("node:crypto");
  return randomBytes(bytes).toString("hex");
}

/**
 * For tests / health checks.
 */
export function isErrorReportingEnabled(): boolean {
  return enabled;
}
