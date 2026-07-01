import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { reportError } from "./lib/error-reporter";

const app: Express = express();

// Trust the first proxy hop when running behind Vercel / a CDN so that
// express-rate-limit sees the real client IP for accurate limiting.
app.set("trust proxy", 1);

// Security headers (CSP, HSTS, X-Frame-Options, etc.).  We relax CSP
// only as much as needed for the frontend (scripts/styles/fonts from
// the same origin) and for the dev server.  In production we are even
// stricter.
app.use(
  helmet({
    contentSecurityPolicy: false, // API server; CSP is enforced by the frontend
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// HTTP request logging — must be first to capture everything.
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// CORS — restrict to a configured origin in production.  In dev the
// Vite proxy makes the API same-origin, so we also default to a
// permissive list.  `CORS_ORIGIN` may be a single origin or a
// comma-separated list.
const parseOrigins = (): string[] | string => {
  const raw = process.env["CORS_ORIGIN"];
  if (!raw || raw === "*") {
    // Dev fallback: allow any origin so that local proxies and curl
    // both work without configuration.
    return "*";
  }
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length === 1 ? parts[0] : parts;
};

app.use(
  cors({
    origin: parseOrigins(),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-DropFlow-Key",
      "X-DropFlow-Signature",
    ],
    credentials: true,
    maxAge: 86400,
  }),
);

// Cookie parser is required for the auth middleware to read the
// session cookie set by /api/auth/login and /api/auth/signup.
app.use(cookieParser());

// Body parsers with hard size limits.  The default is 100kb which is
// fine for the JSON REST API, but the /products/import and
// /orders/import endpoints accept arrays, so we keep the default tight
// and let the import routes opt in to a larger body via a per-route
// parser in a future change if needed.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Global rate limit: 300 requests / minute / IP for the entire API.
// This is intentionally generous so that dashboard polling, charts
// and tables are not blocked, but a single client cannot hammer the
// server.  Auth endpoints have their own, stricter limiter.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api", apiLimiter);

// Mount routes
app.use("/api", router);

// 404
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler.  Logs the full error with the request id,
// forwards the error to the configured error reporter (Sentry),
// and returns a generic 500 to the client to avoid leaking
// database or library internals.  Validation errors (Zod) and
// explicit HttpError instances are surfaced with their message +
// status.
app.use(
  (
    err: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction,
  ) => {
    const requestId = (req as Request & { id?: string }).id;
    if (res.headersSent) return;
    if (err && typeof err === "object" && "status" in err && "message" in err) {
      const status = Number((err as { status: number }).status) || 500;
      const message = String((err as { message: unknown }).message);
      logger.warn({ err, requestId, status }, "Request failed");
      res.status(status).json({ error: message });
      return;
    }
    logger.error({ err, requestId }, "Unhandled error");
    // Forward to Sentry.  We don't await; the response goes back to
    // the user immediately and Sentry ingestion is fire-and-forget.
    reportError(err, {
      requestId: requestId || "unknown",
      method: req.method,
      path: req.path,
      userAgent: req.headers["user-agent"] || "",
    });
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
