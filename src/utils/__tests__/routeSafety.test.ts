import { describe, expect, it } from 'vitest';
import { isSafeReturnTo } from '../routeSafety';

describe('isSafeReturnTo', () => {
  it('accepts an internal path', () => {
    expect(isSafeReturnTo('/duel/abc123?x=1#y')).toBe(true);
  });

  it('rejects null/empty', () => {
    expect(isSafeReturnTo(null)).toBe(false);
    expect(isSafeReturnTo('')).toBe(false);
  });

  it('rejects a path with no leading slash', () => {
    expect(isSafeReturnTo('evil.example')).toBe(false);
  });

  it('rejects an absolute external URL', () => {
    expect(isSafeReturnTo('https://evil.example')).toBe(false);
  });

  it('rejects a protocol-relative URL', () => {
    expect(isSafeReturnTo('//evil.example')).toBe(false);
  });

  it('rejects the backslash-normalization trick', () => {
    expect(isSafeReturnTo('/\\evil.example')).toBe(false);
  });
});
