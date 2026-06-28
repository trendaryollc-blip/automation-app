import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { testCJDropshipping } from '../src/services/cjdropshipping';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('testCJDropshipping returns error when config missing keys', async () => {
  const res = await testCJDropshipping({ apiKey: undefined, apiSecret: undefined });
  expect(res.ok).toBe(false);
  expect(res.error).toMatch(/API key and secret are required/);
});

test('testCJDropshipping returns ok when API responds with account info', async () => {
  const fakeResponse = {
    ok: true,
    json: async () => ({ data: { email: 'test@example.com' } }),
  };

  vi.stubGlobal('fetch', vi.fn(async () => fakeResponse as any));

  const res = await testCJDropshipping({ apiKey: 'k', apiSecret: 's', baseUrl: 'https://api.example.com' });
  expect(res.ok).toBe(true);
  expect(res.message).toContain('Connected as');
});
