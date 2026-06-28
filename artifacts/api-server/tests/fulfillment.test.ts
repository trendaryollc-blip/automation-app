import { test, expect } from 'vitest';
import { detectCategory } from '../src/services/fulfillment-utils';

test('detectCategory recognizes tech products', () => {
  expect(detectCategory('Wireless Earbuds Pro')).toBe('tech');
  expect(detectCategory('USB-C Cable')).toBe('tech');
});

test('detectCategory falls back to general', () => {
  expect(detectCategory('Unique Artifact')).toBe('general');
});
