import { describe, expect, it } from 'vitest';
import { cleanString } from './index';

describe('cleanString', () => {
  it('should return undefined if input is undefined', () => {
    expect(cleanString(undefined as unknown as string)).toBeUndefined();
  });

  it('should return undefined if input is null', () => {
    expect(cleanString(null as unknown as string)).toBeUndefined();
  });

  it('should remove newlines and replace with spaces', () => {
    expect(cleanString('hello\nworld')).toBe('hello world');
    expect(cleanString('hello\n\nworld')).toBe('hello  world');
  });

  it('should trim leading and trailing whitespaces', () => {
    expect(cleanString('  hello world  ')).toBe('hello world');
  });

  it('should handle combination of newlines and extra spaces', () => {
    expect(cleanString('  hello\nworld  ')).toBe('hello world');
  });

  it('should return same string if no newlines and trimmed', () => {
    expect(cleanString('hello world')).toBe('hello world');
  });

  it('should handle empty string', () => {
    expect(cleanString('')).toBe('');
  });
});
