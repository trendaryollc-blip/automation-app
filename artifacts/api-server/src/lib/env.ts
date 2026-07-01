/**
 * Production environment validation.
 *
 * Called once at server boot. Fails fast with a clear, actionable
 * error message when required configuration is missing, so that a
 * misconfigured deployment never silently goes live with unsafe
 * defaults (e.g. CORS_ORIGIN=* + cookies).
 */

export interface ProductionEnvReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Read a string env var, with an optional fallback for non-prod only.
 * Returns `undefined` if the variable is missing/empty.
 */
function readString(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

/**
 * Validate that all required production environment variables are
 * present and safe. Call this at boot.
 *
 * - JWT_SECRET must be set and at least 32 chars.
 * - CORS_ORIGIN must NOT be "*" in production (breaks credentials).
 * - DATABASE_URL must be set (unless DB_MODE=firestore).
 * - In production with DB_MODE=postgres, DATABASE_URL is required.
 */
export function validateProductionEnv(): ProductionEnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isProduction()) {
    return { ok: true, errors, warnings };
  }

  // 1) JWT secret
  const jwt = readString("JWT_SECRET");
  if (!jwt) {
    errors.push(
      "JWT_SECRET is required in production. Generate one with: openssl rand -hex 32",
    );
  } else if (jwt.length < 32) {
    errors.push(
      `JWT_SECRET must be at least 32 characters (got ${jwt.length}).`,
    );
  } else if (
    jwt === "replace-me-with-a-32-plus-character-random-secret" ||
    jwt === "ci-jwt-secret-must-be-32-chars-long-please"
  ) {
    errors.push(
      'JWT_SECRET is still set to the example/placeholder value. Replace it with a real secret.',
    );
  }

  // 2) CORS — must NOT be wildcard in production (with credentials=true)
  const cors = readString("CORS_ORIGIN");
  if (!cors) {
    errors.push(
      "CORS_ORIGIN is required in production. Set it to your exact frontend origin, e.g. https://app.dropflow.com",
    );
  } else if (cors === "*") {
    errors.push(
      'CORS_ORIGIN must NOT be "*" in production. Browsers reject credentials with wildcard CORS. Set it to your exact frontend origin.',
    );
  }

  // 3) Database
  const dbMode = (readString("DB_MODE") || "postgres").toLowerCase();
  if (dbMode === "postgres" && !readString("DATABASE_URL")) {
    errors.push(
      'DATABASE_URL is required in production when DB_MODE is "postgres" (or unset).',
    );
  }

  // 4) Soft warnings
  if (!readString("LOG_LEVEL")) {
    warnings.push(
      "LOG_LEVEL is not set; defaulting to 'info'. Consider 'info' or 'warn' in production.",
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}
