/**
 * Dictée plays its lines with `TTS.speak(line, { recorded: true })`, so a line
 * the catalogue lacks is never recorded and the learner hears the browser voice
 * (or nothing, on a device with no French voice). Every spelling it can play
 * must be catalogued.
 */
import { describe, expect, it } from 'vitest';
import { collectLines, dicteeLines } from '../collectLines';
import { DICTEE_ITEMS, acceptedSpellings } from '../../../src/data/dictee';
import { normalizeSpokenText } from '../../../src/services/tts/voiceKey';

const KEYS = new Set(collectLines().map((l) => normalizeSpokenText(l.text)));

describe('Dictée is in the recording catalogue', () => {
  it('lists every word and sentence exactly as the screen plays it', () => {
    const missing = DICTEE_ITEMS.flatMap(acceptedSpellings).filter((fr) => !KEYS.has(normalizeSpokenText(fr)));
    expect(missing).toEqual([]);
  });

  it('adds only a small, known amount of text', () => {
    // ~5k characters for 150 lines: if this jumps, a long text has slipped into the bank.
    const chars = dicteeLines().reduce((n, t) => n + t.length, 0);
    expect(chars).toBeLessThan(8_000);
    expect(dicteeLines().length).toBe(DICTEE_ITEMS.length);
  });
});
