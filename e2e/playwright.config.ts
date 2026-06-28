import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    headless: true,
  },
  webServer: {
    command: "pnpm --filter @workspace/api-server run dev",
    cwd: "..",
    env: {
      PORT: "8080",
      HOST: "127.0.0.1",
      DATABASE_URL:
        process.env.DATABASE_URL || "postgresql://localhost:5432/dropflow",
      DB_MODE: process.env.DB_MODE || "postgres",
    },
    url: "http://127.0.0.1:8080/api/healthz",
    reuseExistingServer: true,
  },
});
