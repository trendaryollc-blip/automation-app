/**
 * Vercel Serverless Function - API Handler
 *
 * For Vercel deployment, this function handles all /api/* routes.
 * It wraps the Express application for serverless execution.
 */

import express from "express";
import cors from "cors";

const app = express();

// CORS configuration for production
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Health check endpoint
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Import the Express app (uses built version in production, source in development)
async function loadApp() {
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) {
    // Production: use pre-built app bundle
    const { default: expressApp } =
      await import("../artifacts/api-server/dist/app.mjs");
    return expressApp;
  } else {
    // Development: use source app
    const { default: expressApp } =
      await import("../artifacts/api-server/src/app");
    return expressApp;
  }
}

const expressApp = await loadApp();
app.use("/api", expressApp);

// Export the Express app for Vercel
export default app;
