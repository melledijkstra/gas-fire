import { evaluateCondition } from './conditions'

describe('evaluateCondition', () => {
  describe('CONTAINS', () => {
    test('matches case-insensitive substring', () => {
      expect(evaluateCondition('Hello World', 'CONTAINS', 'world')).toBe(true)
    })

    test('returns false when substring not found', () => {
      expect(evaluateCondition('Hello World', 'CONTAINS', 'xyz')).toBe(false)
    })

    test('handles null cell value', () => {
      expect(evaluateCondition(null, 'CONTAINS', 'test')).toBe(false)
    })
  })

  describe('NOT_CONTAINS', () => {
    test('returns true when value not found', () => {
      expect(evaluateCondition('Hello World', 'NOT_CONTAINS', 'xyz')).toBe(true)
    })

    test('returns false when value is found', () => {
      expect(evaluateCondition('Hello World', 'NOT_CONTAINS', 'hello')).toBe(false)
    })
  })

  describe('EQUALS', () => {
    test('matches case-insensitive exact value', () => {
      expect(evaluateCondition('Hello', 'EQUALS', 'hello')).toBe(true)
    })

    test('returns false for partial match', () => {
      expect(evaluateCondition('Hello World', 'EQUALS', 'hello')).toBe(false)
    })

    test('handles numeric cell value', () => {
      expect(evaluateCondition(42, 'EQUALS', '42')).toBe(true)
    })
  })

  describe('REGEX', () => {
    test('matches valid regex pattern', () => {
      expect(evaluateCondition('abc-123', 'REGEX', '\\d+')).toBe(true)
    })

    test('returns false for non-matching pattern', () => {
      expect(evaluateCondition('abc', 'REGEX', '^\\d+$')).toBe(false)
    })

    test('handles invalid regex gracefully', () => {
      expect(evaluateCondition('test', 'REGEX', '[')).toBe(false)
    })

    test('is case-insensitive', () => {
      expect(evaluateCondition('Hello', 'REGEX', '^hello$')).toBe(true)
    })
  })

  describe('NOT_EMPTY', () => {
    test('returns true for non-empty string', () => {
      expect(evaluateCondition('hello', 'NOT_EMPTY')).toBe(true)
    })

    test('returns true for number', () => {
      expect(evaluateCondition(42, 'NOT_EMPTY')).toBe(true)
    })

    test('returns true for zero', () => {
      expect(evaluateCondition(0, 'NOT_EMPTY')).toBe(true)
    })

    test('returns false for null', () => {
      expect(evaluateCondition(null, 'NOT_EMPTY')).toBe(false)
    })

    test('returns false for undefined', () => {
      expect(evaluateCondition(undefined as never, 'NOT_EMPTY')).toBe(false)
    })

    test('returns false for empty string', () => {
      expect(evaluateCondition('', 'NOT_EMPTY')).toBe(false)
    })
  })

  describe('GREATER_THAN', () => {
    test('numeric comparison works', () => {
      expect(evaluateCondition(100, 'GREATER_THAN', '50')).toBe(true)
    })

    test('returns false when equal', () => {
      expect(evaluateCondition(50, 'GREATER_THAN', '50')).toBe(false)
    })

    test('returns false when less', () => {
      expect(evaluateCondition(10, 'GREATER_THAN', '50')).toBe(false)
    })

    test('returns false for non-numeric cell value', () => {
      expect(evaluateCondition('abc', 'GREATER_THAN', '50')).toBe(false)
    })

    test('handles string numbers', () => {
      expect(evaluateCondition('100', 'GREATER_THAN', '50')).toBe(true)
    })

    test('handles negative numbers', () => {
      expect(evaluateCondition(-10, 'GREATER_THAN', '-20')).toBe(true)
    })
  })

  describe('LESS_THAN', () => {
    test('numeric comparison works', () => {
      expect(evaluateCondition(10, 'LESS_THAN', '50')).toBe(true)
    })

    test('returns false when equal', () => {
      expect(evaluateCondition(50, 'LESS_THAN', '50')).toBe(false)
    })

    test('returns false when greater', () => {
      expect(evaluateCondition(100, 'LESS_THAN', '50')).toBe(false)
    })

    test('returns false for non-numeric condition value', () => {
      expect(evaluateCondition(10, 'LESS_THAN', 'abc')).toBe(false)
    })
  })

  describe('edge cases', () => {
    test('handles Date cell value', () => {
      const date = new Date('2024-01-15')
      expect(evaluateCondition(date, 'CONTAINS', '2024')).toBe(true)
    })

    test('handles boolean cell value', () => {
      expect(evaluateCondition(true, 'EQUALS', 'true')).toBe(true)
    })

    test('returns false for unknown condition', () => {
      expect(evaluateCondition('test', 'UNKNOWN' as never, 'test')).toBe(false)
    })
  })
})
