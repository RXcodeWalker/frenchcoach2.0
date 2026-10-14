// When a Junior turn goes to Whisper (junior-track §2, Batch 4).
import { describe, expect, it } from 'vitest';
import { chooseTranscript, needsWhisper, type WhisperChoiceInput } from '../recogniser';
import { MIC_SOUND_LEVEL } from '../warmup';

const base: WhisperChoiceInput = {
  turn: 'question', recogniser: 'webSpeech', webSpeechSupported: true, transcript: "j'aime le bleu", peakMicLevel: 0.5,
};

describe('needsWhisper', () => {
  it('uses Web Speech when it heard words and the warm-up chose it', () => {
    expect(needsWhisper(base)).toBe(false);
  });

  it('uses Whisper for the rest of the mission once the warm-up chose it, even when Web Speech heard words', () => {
    expect(needsWhisper({ ...base, recogniser: 'whisper' })).toBe(true);
  });

  it('uses Whisper when Web Speech is missing (iPad Safari)', () => {
    expect(needsWhisper({ ...base, webSpeechSupported: false, transcript: '' })).toBe(true);
  });

  it('uses Whisper when Web Speech returned nothing for a turn the mic heard', () => {
    expect(needsWhisper({ ...base, transcript: '' })).toBe(true);
    expect(needsWhisper({ ...base, transcript: ' … ' })).toBe(true);
  });

  it('never for a silent capture: it is re-asked, and Whisper hears no more from a silent mic', () => {
    const silent = { transcript: '', peakMicLevel: MIC_SOUND_LEVEL / 2 };
    expect(needsWhisper({ ...base, ...silent })).toBe(false);
    expect(needsWhisper({ ...base, ...silent, recogniser: 'whisper' })).toBe(false);
    expect(needsWhisper({ ...base, ...silent, webSpeechSupported: false })).toBe(false);
  });

  it('never for the warm-up, « Et toi ? » or the demo', () => {
    for (const turn of ['warmup', 'etToi', 'demo'] as const) {
      expect(needsWhisper({ ...base, turn, recogniser: 'whisper', webSpeechSupported: false, transcript: '' })).toBe(false);
    }
  });
});

describe('chooseTranscript', () => {
  it("takes Whisper's text when it has words", () => {
    expect(chooseTranscript('jaime le bleu', "J'aime le bleu.")).toBe("J'aime le bleu.");
  });

  it("keeps Web Speech's transcript when Whisper gave nothing usable", () => {
    expect(chooseTranscript('jaime le bleu', null)).toBe('jaime le bleu');
    expect(chooseTranscript('jaime le bleu', ' . ')).toBe('jaime le bleu');
    expect(chooseTranscript('', null)).toBe('');
  });
});
