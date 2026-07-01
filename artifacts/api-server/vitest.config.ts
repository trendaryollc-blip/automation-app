import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: _dirname,
  resolve: {
    alias: [
      {
        find: /^@workspace\/db\/test-utils$/,
        replacement: path.resolve(
          _dirname,
          "tests/__mocks__/@workspace_db.ts",
        ),
      },
      {
        find: /^@workspace\/db\/firestore$/,
        replacement: path.resolve(
          _dirname,
          "tests/__mocks__/@workspace_db_firestore.ts",
        ),
      },
      {
        find: /^@workspace\/db$/,
        replacement: path.resolve(
          _dirname,
          "tests/__mocks__/@workspace_db.ts",
        ),
      },
      {
        find: /^@workspace\/db\//,
        replacement: path.resolve(
          _dirname,
          "tests/__mocks__/@workspace_db.ts",
        ),
      },
      {
        find: /^drizzle-orm$/,
        replacement: path.resolve(_dirname, "tests/__mocks__/drizzle-orm.ts"),
      },
      {
        find: /^drizzle-orm\//,
        replacement: path.resolve(_dirname, "tests/__mocks__/drizzle-orm.ts"),
      },
    ],
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
