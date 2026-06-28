import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    resolve: {
      alias: {
        '@workspace/db': path.resolve(__dirname, 'tests/__mocks__/@workspace_db.ts'),
        '@workspace/db/': path.resolve(__dirname, 'tests/__mocks__/@workspace_db.ts'),
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/migrations/**'],
      thresholds: {
        lines: 50,
        functions: 40,
        statements: 50,
        branches: 30,
      },
    },
  },
});
