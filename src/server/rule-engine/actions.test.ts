import { applyAction } from './actions'

describe('applyAction', () => {
  describe('EXCLUDE', () => {
    test('returns current value unchanged', () => {
      expect(applyAction('hello', 'EXCLUDE')).toBe('hello')
    })

    test('returns null unchanged', () => {
      expect(applyAction(null, 'EXCLUDE')).toBe(null)
    })
  })

  describe('SET', () => {
    test('returns the action value', () => {
      expect(applyAction('old', 'SET', 'new')).toBe('new')
    })

    test('returns null when action value is undefined', () => {
      expect(applyAction('old', 'SET')).toBe(null)
    })

    test('overwrites numeric value with string', () => {
      expect(applyAction(42, 'SET', 'Groceries')).toBe('Groceries')
    })
  })

  describe('ADD', () => {
    test('adds numeric action value to current value', () => {
      expect(applyAction(100, 'ADD', '50')).toBe(150)
    })

    test('handles null current value as 0', () => {
      expect(applyAction(null, 'ADD', '50')).toBe(50)
    })

    test('returns current value when action value is non-numeric', () => {
      expect(applyAction(100, 'ADD', 'abc')).toBe(100)
    })

    test('returns current value when cell value is non-numeric', () => {
      expect(applyAction('abc', 'ADD', '50')).toBe('abc')
    })

    test('handles negative action value', () => {
      expect(applyAction(100, 'ADD', '-30')).toBe(70)
    })

    test('handles decimal values', () => {
      expect(applyAction(10.5, 'ADD', '2.3')).toBeCloseTo(12.8)
    })
  })

  describe('SUBTRACT', () => {
    test('subtracts numeric action value from current value', () => {
      expect(applyAction(100, 'SUBTRACT', '30')).toBe(70)
    })

    test('handles null current value as 0', () => {
      expect(applyAction(null, 'SUBTRACT', '50')).toBe(-50)
    })

    test('returns current value when action value is non-numeric', () => {
      expect(applyAction(100, 'SUBTRACT', 'abc')).toBe(100)
    })

    test('handles string number as current value', () => {
      expect(applyAction('100', 'SUBTRACT', '30')).toBe(70)
    })
  })

  describe('edge cases', () => {
    test('returns current value for unknown action', () => {
      expect(applyAction('test', 'UNKNOWN' as never, 'value')).toBe('test')
    })
  })
})
