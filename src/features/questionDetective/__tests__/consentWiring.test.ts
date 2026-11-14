import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FEATURE = join(__dirname, '..');

describe('Question Detective speaking consent', () => {
  it('wraps the record control in SpeakingConsentGate and uses the shared recorder', () => {
    const src = readFileSync(join(FEATURE, 'SpeakControl.tsx'), 'utf8');
    expect(src).toContain('SpeakingConsentGate');
    expect(src).toContain('useRecording');
    expect(src).toContain('useSpaceToRecord');
    expect(src).toContain('useMicSilence');
    expect(src).toMatch(/useRecording\(blocked\)/);
    expect(src).toContain("consentStatus === 'pending'");
  });

  it('the say rung falls back to typing when speech is unavailable', () => {
    const round = readFileSync(join(FEATURE, 'RoundView.tsx'), 'utf8');
    expect(round).toContain('sttIsSupported');
    expect(round).toContain('type the answer');
  });
});
