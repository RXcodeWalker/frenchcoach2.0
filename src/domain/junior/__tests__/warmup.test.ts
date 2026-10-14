import { describe, expect, it } from 'vitest';
import { MIC_SOUND_LEVEL, decideWarmup, isSilent, transcriptUsable } from '../warmup';

const loud = MIC_SOUND_LEVEL + 0.2;
const silent = 0;

describe('decideWarmup (junior-track §2)', () => {
  it('sound + usable transcript → Web Speech', () => {
    expect(decideWarmup({ peakMicLevel: loud, transcript: 'Bonjour Léo', attempt: 1 })).toBe('webSpeech');
  });

  it('sound + no usable transcript → Whisper for the rest of the mission', () => {
    expect(decideWarmup({ peakMicLevel: loud, transcript: '', attempt: 1 })).toBe('whisper');
    expect(decideWarmup({ peakMicLevel: loud, transcript: '  … ', attempt: 1 })).toBe('whisper');
    expect(decideWarmup({ peakMicLevel: MIC_SOUND_LEVEL, transcript: '', attempt: 2 })).toBe('whisper');
  });

  it('no sound → check the mic, once', () => {
    expect(decideWarmup({ peakMicLevel: silent, transcript: '', attempt: 1 })).toBe('checkMic');
  });

  it('no sound on the second try → the mission carries on (never a second mic hint)', () => {
    expect(decideWarmup({ peakMicLevel: silent, transcript: '', attempt: 2 })).toBe('webSpeech');
  });

  it('a usable transcript proves the mic worked, even under the level threshold (quiet kid)', () => {
    expect(decideWarmup({ peakMicLevel: silent, transcript: 'bonjour', attempt: 1 })).toBe('webSpeech');
  });

  it('any word is usable; empty or punctuation is not', () => {
    expect(transcriptUsable('bonjour')).toBe(true);
    expect(transcriptUsable('ok')).toBe(true);
    expect(transcriptUsable('')).toBe(false);
    expect(transcriptUsable(' ?! ')).toBe(false);
  });
});

describe('isSilent', () => {
  it('is silence only when there is no usable transcript AND no sound', () => {
    expect(isSilent({ peakMicLevel: silent, transcript: '' })).toBe(true);
    expect(isSilent({ peakMicLevel: silent, transcript: ' … ' })).toBe(true);
  });
  it('sound without a transcript is a recogniser miss, not silence', () => {
    expect(isSilent({ peakMicLevel: loud, transcript: '' })).toBe(false);
  });
  it('a transcript is never silence, even under the level threshold', () => {
    expect(isSilent({ peakMicLevel: silent, transcript: 'bleu' })).toBe(false);
  });
});
