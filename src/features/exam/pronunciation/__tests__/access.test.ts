import { describe, expect, it } from 'vitest';
import { examPronunciationUiEnabled } from '../access';

describe('examPronunciationUiEnabled', () => {
  it('is off for an ordinary account while the build is not public', () => {
    expect(examPronunciationUiEnabled({ isAdmin: false, consentStatus: 'confirmed', publicFlag: undefined })).toBe(false);
    expect(examPronunciationUiEnabled({ isAdmin: false, consentStatus: 'confirmed', publicFlag: '0' })).toBe(false);
    expect(examPronunciationUiEnabled({ isAdmin: false, consentStatus: 'confirmed', publicFlag: 'true' })).toBe(false);
  });

  it('is on for an admin, whatever the build flag says', () => {
    expect(examPronunciationUiEnabled({ isAdmin: true, consentStatus: 'confirmed', publicFlag: '0' })).toBe(true);
    expect(examPronunciationUiEnabled({ isAdmin: true, consentStatus: 'unknown', publicFlag: '0' })).toBe(true);
  });

  it('is on for everyone only when the build sets VITE_EXAM_PRONUNCIATION_PUBLIC=1', () => {
    expect(examPronunciationUiEnabled({ isAdmin: false, consentStatus: 'confirmed', publicFlag: '1' })).toBe(true);
    // a guest (no profile row, consent unknown) still gets the surface; the client then resolves `signed_out`
    expect(examPronunciationUiEnabled({ isAdmin: false, consentStatus: 'unknown', publicFlag: '1' })).toBe(true);
  });

  it('is never on for a pending (under-13, guardian not confirmed) account', () => {
    expect(examPronunciationUiEnabled({ isAdmin: true, consentStatus: 'pending', publicFlag: '1' })).toBe(false);
    expect(examPronunciationUiEnabled({ isAdmin: false, consentStatus: 'pending', publicFlag: '1' })).toBe(false);
  });
});
