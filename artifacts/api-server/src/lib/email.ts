/**
 * Email service.
 *
 * A small, swappable interface so we can develop without an email
 * provider and then flip a flag to send real email in production.
 *
 *   - provider "log"  : prints the email to the server log (default,
 *                        used in development / tests so we never
 *                        accidentally email real customers).
 *   - provider "resend": posts to the Resend REST API.
 *
 * Set EMAIL_PROVIDER=resend and RESEND_API_KEY to enable real
 * delivery.  When unconfigured, sendEmail() is a no-op with a log
 * line so the rest of the app keeps working in development.
 */

import { logger } from "./logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface EmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

function readString(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function defaultFrom(): string {
  return readString("EMAIL_FROM") || "DropFlow <no-reply@dropflow.local>";
}

async function sendViaLog(msg: EmailMessage): Promise<EmailResult> {
  logger.info(
    {
      to: msg.to,
      subject: msg.subject,
      from: msg.from ?? defaultFrom(),
      textLen: msg.text.length,
    },
    "[email:log] would send email",
  );
  logger.debug({ body: msg.text, html: msg.html }, "[email:log] email body");
  return { ok: true, id: "log:" + Date.now().toString(36) };
}

async function sendViaResend(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = readString("RESEND_API_KEY");
  if (!apiKey) {
    logger.warn(
      { to: msg.to, subject: msg.subject },
      "[email:resend] RESEND_API_KEY not set, falling back to log",
    );
    return sendViaLog(msg);
  }
  const baseUrl = readString("RESEND_BASE_URL") || "https://api.resend.com";
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: msg.from ?? defaultFrom(),
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      logger.error(
        { to: msg.to, status: res.status, body: errBody },
        "[email:resend] send failed",
      );
      return {
        ok: false,
        error: `Resend returned ${res.status}: ${errBody.slice(0, 200)}`,
      };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    logger.error({ err, to: msg.to }, "[email:resend] network error");
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const provider = (readString("EMAIL_PROVIDER") || "log").toLowerCase();
  switch (provider) {
    case "resend":
      return sendViaResend(msg);
    case "log":
    case "dev":
    case "console":
      return sendViaLog(msg);
    default:
      logger.warn(
        { provider },
        "[email] unknown EMAIL_PROVIDER, falling back to log",
      );
      return sendViaLog(msg);
  }
}

// Minimal HTML escape using String.fromCharCode to avoid encoding
// issues in source files.  The five standard XML entities are:
const AMP = String.fromCharCode(38) + "amp;";
const LT = String.fromCharCode(38) + "lt;";
const GT = String.fromCharCode(38) + "gt;";
const QUOT = String.fromCharCode(38) + "quot;";
const APOS = String.fromCharCode(38) + "#39;";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT)
    .replace(/'/g, APOS);
}

/**
 * Render a tiny HTML email from a heading, a paragraph, and a
 * primary call-to-action button.  We avoid a templating library to
 * keep the bundle small.
 */
export function renderSimpleEmail(args: {
  title: string;
  preheader?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}): { text: string; html: string } {
  const text = [
    args.title,
    "",
    args.preheader ? args.preheader : "",
    args.body,
    args.ctaLabel && args.ctaUrl ? `${args.ctaLabel}: ${args.ctaUrl}` : "",
    args.footer ? `--\n${args.footer}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const titleHtml = escapeHtml(args.title);
  const preheaderHtml = args.preheader
    ? `<p style="margin:0 0 16px 0;color:#6b7280;font-size:14px;">${escapeHtml(args.preheader)}</p>`
    : "";
  const bodyHtml = `<p style="margin:0 0 16px 0;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(args.body)}</p>`;
  const ctaHtml =
    args.ctaLabel && args.ctaUrl
      ? `<p style="margin:24px 0;"><a href="${escapeHtml(args.ctaUrl)}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block;">${escapeHtml(args.ctaLabel)}</a></p>`
      : "";
  const footerHtml = args.footer
    ? `<p style="margin:24px 0 0 0;color:#9ca3af;font-size:12px;">${escapeHtml(args.footer)}</p>`
    : "";

  const html =
    '<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7f9;padding:24px;">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e7eb;">' +
    `<h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">${titleHtml}</h1>` +
    preheaderHtml +
    bodyHtml +
    ctaHtml +
    footerHtml +
    "</div></body></html>";

  return { text, html };
}
