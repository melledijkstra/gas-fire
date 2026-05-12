import { slugify, structuredCloneFallback, structuredClone, getRowHash } from './helpers'

describe('helpers', () => {
  describe('slugify', () => {
    it('should convert text to a slug', () => {
      expect(slugify('Hello World!')).toBe('hello-world')
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces')
      expect(slugify('Special@Characters#')).toBe('specialcharacters')
    })

    test('slugify bank names', () => {
      expect(slugify('Bank of America')).toBe('bank-of-america')
      expect(slugify('N26')).toBe('n26')
      expect(slugify('ING')).toBe('ing')
      expect(slugify('Banco de España')).toBe('banco-de-espaa')
    })

    test('should handle empty strings', () => {
      expect(slugify('')).toBe('')
    })
  })

  describe('structuredCloneFallback', () => {
    it('normal structuredClone works', () => {
      const fnSpy = vi.spyOn(globalThis, 'structuredClone')
      const obj = { a: 1, b: 2 }
      const clonedObj = structuredClone(obj)
      expect(fnSpy).toHaveBeenCalled()
      expect(clonedObj).toEqual(obj)
      expect(clonedObj).not.toBe(obj)
    })

    it('should clone a simple object', () => {
      const obj = { a: 1, b: 2 }
      const clonedObj = structuredCloneFallback(obj)
      expect(clonedObj).toEqual(obj)
      expect(clonedObj).not.toBe(obj)
    })

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } }
      const clonedObj = structuredCloneFallback(obj)
      expect(clonedObj).toEqual(obj)
      expect(clonedObj).not.toBe(obj)
      expect(clonedObj.a).not.toBe(obj.a)
      expect(clonedObj.a.b).not.toBe(obj.a.b)
    })

    it('should clone arrays', () => {
      const arr = [1, 2, [3, 4]]
      const clonedArr = structuredCloneFallback(arr)
      expect(clonedArr).toEqual(arr)
      expect(clonedArr).not.toBe(arr)
      expect(clonedArr[2]).not.toBe(arr[2])
    })

    it('should clone complex objects', () => {
      const obj = { a: 1, b: [2, { c: 3 }] }
      const clonedObj = structuredCloneFallback(obj)
      expect(clonedObj).toEqual(obj)
      expect(clonedObj).not.toBe(obj)
      expect(clonedObj.b[1]).not.toBe(obj.b[1])
    })

    it('should clone dates', () => {
      const date = new Date()
      const clonedDate = structuredCloneFallback(date)
      expect(clonedDate).toEqual(date)
      expect(clonedDate).not.toBe(date)
      expect(clonedDate instanceof Date).toBe(true)
      expect(clonedDate.getTime()).toBe(date.getTime())
    })

    it('should clone maps', () => {
      const map = new Map([['a', 1], ['b', 2]])
      const clonedMap = structuredCloneFallback(map)
      expect(clonedMap).toEqual(map)
      expect(clonedMap).not.toBe(map)
      expect(clonedMap instanceof Map).toBe(true)
    })

    it('should clone sets', () => {
      const set = new Set([1, 2, 3])
      const clonedSet = structuredCloneFallback(set)
      expect(clonedSet).toEqual(set)
      expect(clonedSet).not.toBe(set)
      expect(clonedSet instanceof Set).toBe(true)
    })
  })

  describe('getRowHash', () => {
    it('should generate a hash from specific columns', () => {
      const date = new Date('2023-01-01T00:00:00.000Z')
      // FIRE_COLUMNS = ['ref', 'iban', 'date', 'amount', 'balance', 'contra_account', 'description', ...]
      // HASH_COLUMNS = ['iban', 'date', 'amount', 'contra_account', 'description']
      // Indices: 1, 2, 3, 5, 6
      const row = [
        'ref123', // 0
        'NLINGB123', // 1 (iban)
        date, // 2 (date)
        12.34, // 3 (amount)
        1000.00, // 4
        'CONTRA123', // 5 (contra_account)
        'Test transaction', // 6 (description)
        'some comment', // 7
      ]
      const expectedHash = `NLINGB123|${date.toISOString()}|12.34|CONTRA123|Test transaction`
      expect(getRowHash(row)).toBe(expectedHash)
    })

    it('should handle null and undefined values by converting to empty strings', () => {
      const row = [
        null, // 0
        undefined, // 1 (iban)
        null, // 2 (date)
        0, // 3 (amount)
        null, // 4
        null, // 5 (contra_account)
        undefined, // 6 (description)
      ]
      expect(getRowHash(row)).toBe('||0||')
    })

    it('should handle different data types', () => {
      const row = [
        'ref',
        'iban',
        new Date('2024-12-31T23:59:59.999Z'),
        -50.5,
        0,
        123456,
        true,
      ]
      const expectedDateStr = new Date('2024-12-31T23:59:59.999Z').toISOString()
      expect(getRowHash(row as unknown as CellValue[])).toBe(`iban|${expectedDateStr}|-50.5|123456|true`)
    })
  })
})
