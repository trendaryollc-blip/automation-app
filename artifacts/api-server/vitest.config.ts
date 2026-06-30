import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@workspace/db": path.resolve(
        __dirname,
        "tests/__mocks__/@workspace_db.ts",
      ),
      "@workspace/db/firestore": path.resolve(
        __dirname,
        "tests/__mocks__/@workspace_db_firestore.ts",
      ),
      "@workspace/db/": path.resolve(
        __dirname,
        "tests/__mocks__/@workspace_db.ts",
      ),
      "drizzle-orm": path.resolve(__dirname, "tests/__mocks__/drizzle-orm.ts"),
      "drizzle-orm/": path.resolve(__dirname, "tests/__mocks__/drizzle-orm.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json"],
      include: ["src/**/*.ts"],
      exclude: ["src/migrations/**"],
      thresholds: {
        lines: 25,
        functions: 25,
        statements: 25,
        branches: 15,
      },
    },
  },
});
