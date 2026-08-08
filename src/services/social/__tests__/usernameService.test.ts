import { describe, it, expect } from 'vitest';
import { isValidUsername } from '../usernameService';

describe('isValidUsername', () => {
  it('accepts a plain lowercase name', () => {
    expect(isValidUsername('marie')).toBe(true);
  });

  it('accepts mixed case, digits, and underscores', () => {
    expect(isValidUsername('Marie_92')).toBe(true);
  });

  it('accepts the minimum length (3 chars)', () => {
    expect(isValidUsername('abc')).toBe(true);
  });

  it('accepts the maximum length (20 chars)', () => {
    expect(isValidUsername('a'.repeat(20))).toBe(true);
  });

  it('rejects fewer than 3 characters', () => {
    expect(isValidUsername('ab')).toBe(false);
  });

  it('rejects more than 20 characters', () => {
    expect(isValidUsername('a'.repeat(21))).toBe(false);
  });

  it('rejects a name starting with a digit', () => {
    expect(isValidUsername('1marie')).toBe(false);
  });

  it('rejects a name starting with an underscore', () => {
    expect(isValidUsername('_marie')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(isValidUsername('marie dupont')).toBe(false);
  });

  it('rejects accented characters', () => {
    expect(isValidUsername('émilie')).toBe(false);
  });

  it('rejects punctuation', () => {
    expect(isValidUsername('marie.d')).toBe(false);
    expect(isValidUsername('marie-d')).toBe(false);
    expect(isValidUsername('marie@d')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidUsername('')).toBe(false);
  });
});
