import { test, expect } from 'vitest';
import { Transformers } from './transformers';

test('Transformers.transformMoney', () => {
  expect(Transformers.transformMoney('23,5')).toBe(23.5);
});
