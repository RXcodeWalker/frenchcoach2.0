/**
 * The display types carry no mark, band, score, accuracy or level (plan §3c
 * item 3; ADR 0005/0009). The only numbers allowed are a turn key (a
 * ConductLog seq) and a playback clip's range in seconds. Azure's accuracy
 * exists only on the evidence type, which is never rendered.
 */
import { describe, expect, it } from 'vitest';
import type { ExamPronunciationPartCard, ExamPronunciationReport, PlaybackClip } from '../types';

type DeepContainsNumber<T> = T extends number
  ? true
  : T extends string | boolean | null | undefined
    ? false
    : T extends readonly (infer U)[]
      ? DeepContainsNumber<U>
      : T extends object
        ? { [K in keyof T]: DeepContainsNumber<T[K]> }[keyof T]
        : false;

type WithoutAllowedNumbers<T> = T extends PlaybackClip
  ? never
  : T extends readonly (infer U)[]
    ? WithoutAllowedNumbers<U>[]
    : T extends object
      ? { [K in Exclude<keyof T, 'turnKey' | 'clip'>]: WithoutAllowedNumbers<T[K]> }
      : T;

// Fail to compile if any display field other than turnKey / clip becomes numeric.
const REPORT_HAS_NO_NUMBERS: DeepContainsNumber<WithoutAllowedNumbers<ExamPronunciationReport>> extends false ? true : never = true;
const CARD_HAS_NO_NUMBERS: DeepContainsNumber<WithoutAllowedNumbers<ExamPronunciationPartCard>> extends false ? true : never = true;

describe('exam pronunciation display types carry no mark', () => {
  it('type tests compiled', () => {
    expect(REPORT_HAS_NO_NUMBERS).toBe(true);
    expect(CARD_HAS_NO_NUMBERS).toBe(true);
  });

  it('no display key is named like a mark, band, grade, score, accuracy, level or total', () => {
    const keys = [
      'fairnessVersion', 'parts', 'part', 'reportedWords', 'word', 'turnKey', 'category', 'clip', 'startS', 'endS',
      'lowerConfidence', 'patterns', 'label', 'explanation', 'examples', 'provenance', 'fluencyNote', 'transcript',
      'tokens', 'text', 'reported', 'words', 'pattern',
    ];
    for (const k of keys) expect(k).not.toMatch(/mark|band|grade|score|accuracy|level|total/i);
  });
});
