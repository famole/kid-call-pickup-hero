import { isValidUUID, generateMockUUID } from '../src/utils/validators';
import { describe, expect, test } from 'bun:test';

describe('isValidUUID', () => {
  test('validates correct UUIDs', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(isValidUUID(uuid)).toBe(true);
  });

  test('rejects invalid UUIDs', () => {
    expect(isValidUUID('invalid-id')).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });
});

describe('generateMockUUID', () => {
  test('generates a valid UUID', () => {
    const mock = generateMockUUID();
    expect(isValidUUID(mock)).toBe(true);
  });
});
