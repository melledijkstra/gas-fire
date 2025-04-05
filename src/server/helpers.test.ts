import { describe, it, expect } from 'vitest';
import { slugify, structuredCloneFallback } from './helpers';

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

  describe('structuredCloneFallback', () => {
    it('normal structuredClone works', () => {
      const fnSpy = vi.spyOn(globalThis, 'structuredClone')
      const obj = { a: 1, b: 2 };
      const clonedObj = structuredClone(obj);
      expect(fnSpy).toHaveBeenCalled();
      expect(clonedObj).toEqual(obj);
      expect(clonedObj).not.toBe(obj);
    })

    it('should clone a simple object', () => {
      const obj = { a: 1, b: 2 };
      const clonedObj = structuredCloneFallback(obj);
      expect(clonedObj).toEqual(obj);
      expect(clonedObj).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const clonedObj = structuredCloneFallback(obj);
      expect(clonedObj).toEqual(obj);
      expect(clonedObj).not.toBe(obj);
      expect(clonedObj.a).not.toBe(obj.a);
      expect(clonedObj.a.b).not.toBe(obj.a.b);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, [3, 4]];
      const clonedArr = structuredCloneFallback(arr);
      expect(clonedArr).toEqual(arr);
      expect(clonedArr).not.toBe(arr);
      expect(clonedArr[2]).not.toBe(arr[2]);
    });

    it('should clone complex objects', () => {
      const obj = { a: 1, b: [2, { c: 3 }] };
      const clonedObj = structuredCloneFallback(obj);
      expect(clonedObj).toEqual(obj);
      expect(clonedObj).not.toBe(obj);
      expect(clonedObj.b[1]).not.toBe(obj.b[1]);
    });
  });
});