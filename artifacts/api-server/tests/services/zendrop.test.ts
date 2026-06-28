import { describe, it, expect } from 'vitest';
import { testZendrop } from '../../src/services/zendrop';

describe('zendrop', () => {
  describe('testZendrop', () => {
    it('returns error when config is missing API key', async () => {
      const res = await testZendrop({ apiKey: undefined });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Zendrop API key is required/);
    });

    it('returns error when config is null', async () => {
      const res = await testZendrop(null);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Zendrop API key is required/);
    });

    it('returns ok when API responds', async () => {
      const fakeResponse = {
        ok: true,
        json: async () => ({ data: { email: 'test@zendrop.com' } }),
      };
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => fakeResponse as any;

      const res = await testZendrop({ apiKey: 'valid-key', baseUrl: 'https://api.example.com' });
      expect(res.ok).toBe(true);
      expect(res.message).toContain('Connected as');

      globalThis.fetch = originalFetch;
    });

    it('handles fetch errors', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => { throw new Error('Network error'); };

      const res = await testZendrop({ apiKey: 'k' });
      expect(res.ok).toBe(false);
      expect(res.error).toContain('Zendrop connection failed');

      globalThis.fetch = originalFetch;
    });
  });
});
