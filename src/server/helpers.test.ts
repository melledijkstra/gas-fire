import { describe, it, expect } from 'vitest';
import { slugify } from './helpers';

describe('helpers', () => {
  describe('slugify', () => {
    it('should convert text to a slug', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('Special@Characters#')).toBe('specialcharacters');
    });

    test('slugify bank names', () => {
      expect(slugify('Bank of America')).toBe('bank-of-america');
      expect(slugify('N26')).toBe('n26');
      expect(slugify('ING')).toBe('ing');
      expect(slugify('Banco de España')).toBe('banco-de-espaa');
    })

    test('should handle empty strings', () => {
      expect(slugify('')).toBe('');
    });
  });
});