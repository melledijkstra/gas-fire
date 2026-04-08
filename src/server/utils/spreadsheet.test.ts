import { describe, it, expect } from 'vitest';
import { columnToLetter } from './spreadsheet';

describe('columnToLetter', () => {
  it('should convert 1 to A', () => expect(columnToLetter(1)).toBe('A'));
  it('should convert 26 to Z', () => expect(columnToLetter(26)).toBe('Z'));
  it('should convert 27 to AA', () => expect(columnToLetter(27)).toBe('AA'));
  it('should convert 52 to AZ', () => expect(columnToLetter(52)).toBe('AZ'));
  it('should convert 53 to BA', () => expect(columnToLetter(53)).toBe('BA'));
});
