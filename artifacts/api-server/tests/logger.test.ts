import { test, expect } from 'vitest';
import { logger } from '../src/lib/logger';

test('logger has info function', () => {
  expect(typeof logger.info).toBe('function');
});
