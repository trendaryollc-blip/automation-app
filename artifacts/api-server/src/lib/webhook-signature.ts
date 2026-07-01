/**
 * HMAC-SHA256 webhook signature verification.
 *
 * Compatible with the convention used by Stripe / Shopify / GitHub:
 *   header:   X-DropFlow-Signature: t=<unix_ts>,v1=<hex>
 *   payload:  `${unix_ts}.${rawRequestBody}`
 *
 * Both the timestamp and the body are part of the signed string so an
 * attacker can't replay an old captured payload against a new request.
 *
 * To verify on the sender side (e.g. from a custom integration):
 *
 *   const ts = Math.floor(Date.now() / 1000);
 *   const payload = `${ts}.${rawBody}`;
 *   const sig = crypto.createHmac("sha256", secret)
 *     .update(payload).digest("hex");
 *   // send header "X-DropFlow-Signature: t=<ts>,v1=<sig>"
 *
 * The secret is the per-connection `apiKey` (the same one used as
 * `X-DropFlow-Key`); we hash it with SHA-256 to get a stable signing
 * key of the right length without storing another secret on the row.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_SECONDS = 5 * 60; // reject signatures older than 5 minutes

function parseSignatureHeader(
  header: string | undefined,
): { t: number; v1: string } | null {
  if (!header || typeof header !== "string") return null;
  const parts = header.split(",").map((s) => s.trim());
  let t: number | null = null;
  let v1: string | null = null;
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq <= 0) continue;
    const key = p.slice(0, eq).trim();
    const val = p.slice(eq + 1).trim();
    if (key === "t") t = Number(val);
    if (key === "v1") v1 = val;
  }
  if (t === null || v1 === null) return null;
  if (!Number.isFinite(t)) return null;
  return { t, v1 };
}

/**
 * Derive a stable signing key from the connection's API key.
 * We use SHA-256(apiKey) so the same per-connection secret can be
 * stored once and used for both the static `X-DropFlow-Key` header
 * (route lookup) and HMAC signature verification.
 */
function deriveSigningKey(apiKey: string): Buffer {
  return createHash("sha256").update(apiKey).digest();
}

/**
 * Verify a webhook signature.
 *
 * @returns true if the signature is valid and within the allowed time
 *   window; false otherwise.  Never throws.
 */
export function verifyWebhookSignature(args: {
  signatureHeader: string | undefined;
  rawBody: string;
  apiKey: string;
  now?: number; // injectable for tests
}): boolean {
  const parsed = parseSignatureHeader(args.signatureHeader);
  if (!parsed) return false;
  const now = args.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.t) > MAX_SKEW_SECONDS) return false;

  const key = deriveSigningKey(args.apiKey);
  const expected = createHmac("sha256", key)
    .update(`${parsed.t}.${args.rawBody}`)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(parsed.v1, "hex");
  } catch {
    return false;
  }
  if (received.length !== expected.length) return false;
  try {
    return timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

/**
 * Helper for tests / examples: compute a signature the same way the
 * server will.  Not used at runtime.
 */
export function signWebhookPayload(args: {
  rawBody: string;
  apiKey: string;
  timestamp?: number;
}): string {
  const t = args.timestamp ?? Math.floor(Date.now() / 1000);
  const key = deriveSigningKey(args.apiKey);
  const v1 = createHmac("sha256", key)
    .update(`${t}.${args.rawBody}`)
    .digest("hex");
  return `t=${t},v1=${v1}`;
}
