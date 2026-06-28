import { vi } from "vitest";

// Mock @workspace/db — our in-memory mock
vi.mock("@workspace/db", async () => {
  const mod = await import("./__mocks__/@workspace_db");
  return mod;
});

// Mock drizzle-orm so route handlers receive the same query helpers as production.
vi.mock("drizzle-orm", async () => {
  const mod = await import("./__mocks__/@workspace_db.ts");
  return {
    eq: mod.eq,
    desc: mod.desc,
    asc: mod.asc,
    count: mod.count,
    inArray: mod.inArray,
    gte: mod.gte,
    lt: mod.lt,
    and: mod.and,
    sql: mod.sql,
  };
});

// Mock @workspace/db/firestore — used by ai-settings and store-connections
vi.mock("@workspace/db/firestore", () => ({
  isFirestoreMode: () => false,
  aiSettingsRepo: () => ({
    findMany: async () => [],
    findById: async () => null,
    findOne: async () => null,
    createWithId: async () => {},
    remove: async () => {},
  }),
}));

// Mock external services for ai.ts
vi.mock("../src/services/ai.js", () => ({
  getKey: vi.fn().mockResolvedValue(null),
  hasKey: vi.fn().mockResolvedValue(false),
  tryProviders: vi.fn().mockRejectedValue(new Error("NO_AI_KEYS")),
  generateDescription: vi.fn().mockRejectedValue(new Error("NO_AI_KEYS")),
  scoreProduct: vi.fn().mockRejectedValue(new Error("NO_AI_KEYS")),
  researchProduct: vi.fn().mockRejectedValue(new Error("NO_AI_KEYS")),
  findSuppliers: vi.fn().mockRejectedValue(new Error("NO_AI_KEYS")),
}));
