import { test, expect } from 'vitest';
import { Transformers } from './transformers';

test('Transformers.transformMoney', () => {
  expect(Transformers.transformMoney('23.5')).toBe(23.5);
  expect(Transformers.transformMoney('23.50000000')).toBe(23.5);
  expect(Transformers.transformMoney('23.123456789')).toBe(23.123456789);
  expect(Transformers.transformMoney('23,1234', ',', '.')).toBe(23.1234);
  expect(Transformers.transformMoney('5023.1234')).toBe(5023.1234);
  expect(Transformers.transformMoney('1,234.56')).toBe(1234.56);
  expect(Transformers.transformMoney('+1,234.56')).toBe(1234.56);
  expect(Transformers.transformMoney('-1,234.56')).toBe(-1234.56);
});
