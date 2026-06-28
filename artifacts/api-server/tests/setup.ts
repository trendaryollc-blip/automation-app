import { vi } from 'vitest';

// Mock @workspace/db — our in-memory mock
vi.mock('@workspace/db', async () => {
  const mod = await import('./__mocks__/@workspace_db');
  return mod;
});

// Mock drizzle-orm to prevent pg (postgres) from loading
vi.mock('drizzle-orm', () => ({
  eq: () => ({ _field: '', _value: '', operator: 'eq' }),
  desc: () => ({ _field: '', _dir: 'desc' }),
  asc: () => ({ _field: '', _dir: 'asc' }),
  count: () => ({ _field: 'count', operator: 'count' }),
  inArray: () => ({ _field: '', _values: [], operator: 'in' }),
  gte: () => ({ _field: '', _value: '', operator: 'gte' }),
  lt: () => ({ _field: '', _value: '', operator: 'lt' }),
  and: () => ({ _and: [], operator: 'and' }),
  sql: () => ({ _sql: '', _values: [] }),
}));

// Mock @workspace/db/firestore — used by ai-settings and store-connections
vi.mock('@workspace/db/firestore', () => ({
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
vi.mock('../src/services/ai.js', () => ({
  getKey: vi.fn().mockResolvedValue(null),
  hasKey: vi.fn().mockResolvedValue(false),
  tryProviders: vi.fn().mockRejectedValue(new Error('NO_AI_KEYS')),
  generateDescription: vi.fn().mockRejectedValue(new Error('NO_AI_KEYS')),
  scoreProduct: vi.fn().mockRejectedValue(new Error('NO_AI_KEYS')),
  researchProduct: vi.fn().mockRejectedValue(new Error('NO_AI_KEYS')),
  findSuppliers: vi.fn().mockRejectedValue(new Error('NO_AI_KEYS')),
}));
