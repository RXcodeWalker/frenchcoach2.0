import { describe, expect, it } from 'vitest';
import { resolveVoice } from '../voice';

describe('resolveVoice (junior-track §7)', () => {
  it('a recorded file always wins, whether or not the browser has a French voice', () => {
    expect(resolveVoice({ hasFile: true, hasFrenchVoice: false })).toBe('file');
    expect(resolveVoice({ hasFile: true, hasFrenchVoice: true })).toBe('file');
  });

  it('without a file a French voice reads the text', () => {
    expect(resolveVoice({ hasFile: false, hasFrenchVoice: true })).toBe('tts');
  });

  it('without a file and without a French voice there is NO voice — an English voice never reads French', () => {
    expect(resolveVoice({ hasFile: false, hasFrenchVoice: false })).toBe('none');
  });
});
