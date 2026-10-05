import { describe, expect, it } from 'vitest';
import { buildExamPronunciationReport, buildPartCard, CLIP_PADDING_S } from '../buildReport';
import type { SpeechTurn } from '../segment';
import type { TrimSegment } from '../trim';
import { bad, ev, turn } from './evidenceFixture';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

const speech = (turnKey: number, part: SpeechTurn['part'], transcript: string): SpeechTurn => ({
  turnKey, part, questionId: null, transcript,
});

function fixture() {
  const rp = turn(3, [ev('Je'), ev('voudrais'), bad('vingt', 10, { offsetMs: 1_000, durationMs: 400 }), ev('euros')], {}, 'rolePlay');
  const t1 = turn(9, [ev('Je'), ev('vais'), bad('souvent', 12), ev('au'), bad('cinéma', 50), ev('avec'), bad('mes', 20), ev('amis')]);
  const t1b = turn(11, [ev('Le'), bad('pain', 15), ev('est'), ev('bon')], { pauseStats: { pausesOver2s: 1, longestPauseS: 2.6 } });
  const turns = [
    speech(11, 'topic1', 'Le pain est bon'),
    speech(3, 'rolePlay', 'Je voudrais vingt euros'),
    speech(9, 'topic1', 'Je vais souvent au cinéma avec mes amis'),
    speech(20, 'topic2', 'Je ne sais pas'),
  ];
  return { evidence: [rp, t1, t1b], turns };
}

describe('buildExamPronunciationReport', () => {
  it('walks parts in exam order and only lists parts with speech turns', () => {
    const { evidence, turns } = fixture();
    const report = buildExamPronunciationReport({ turns, evidence });
    expect(report.parts.map((p) => p.part)).toEqual(['rolePlay', 'topic1', 'topic2']);
    expect(report.parts[1].reportedWords.map((w) => w.word)).toEqual(['souvent', 'mes', 'pain']);
    expect(report.parts[2].reportedWords).toEqual([]); // topic2 not analysed
  });

  it('highlights reported words in the candidate transcript', () => {
    const { evidence, turns } = fixture();
    const report = buildExamPronunciationReport({ turns, evidence });
    const t9 = report.transcript.find((t) => t.turnKey === 9)!;
    expect(t9.tokens.filter((t) => t.reported).map((t) => t.text)).toEqual(['souvent', 'mes']);
    expect(report.transcript.map((t) => t.turnKey)).toEqual([3, 9, 11, 20]);
  });

  it('maps a word back into the original recording, padded, when the recording is in memory', () => {
    const { evidence, turns } = fixture();
    const segments: TrimSegment[] = [{ origStartS: 0.5, origEndS: 4, trimmedStartS: 0 }];
    const report = buildExamPronunciationReport({ turns, evidence, trimSegments: new Map([[3, segments]]) });
    const [vingt] = report.parts[0].reportedWords;
    expect(vingt.clip!.startS).toBeCloseTo(1.5 - CLIP_PADDING_S);
    expect(vingt.clip!.endS).toBeCloseTo(1.9 + CLIP_PADDING_S);
    expect(report.parts[1].reportedWords.every((w) => w.clip === null)).toBe(true); // "recording not kept"
  });

  it('builds patterns (≥2 distinct words) and a fluency note per part and overall', () => {
    const { evidence, turns } = fixture();
    const report = buildExamPronunciationReport({ turns, evidence });
    expect(report.patterns.map((p) => [p.category, p.examples])).toEqual([['nasalVowel', ['vingt', 'souvent', 'pain']]]);
    expect(report.parts[1].patterns.map((p) => p.examples)).toEqual([['souvent', 'pain']]);
    expect(report.parts[1].fluencyNote).toContain('more than 2 seconds 1 time');
    expect(report.fluencyNote).not.toBeNull();
  });

  it('never mutates what it is given', () => {
    const { evidence, turns } = fixture();
    const before = structuredClone({ evidence, turns });
    deepFreeze(evidence);
    deepFreeze(turns);
    buildExamPronunciationReport({ turns, evidence });
    expect({ evidence, turns }).toEqual(before);
  });

  it('flags a part analysed with a single recogniser', () => {
    const { evidence, turns } = fixture();
    const single = evidence.map((e) => (e.part === 'rolePlay' ? { ...e, singleRecognizer: true } : e));
    const report = buildExamPronunciationReport({ turns, evidence: single });
    expect(report.parts[0].lowerConfidence).toBe(true);
    expect(report.parts[1].lowerConfidence).toBe(false);
    expect(report.lowerConfidence).toBe(true);
  });
});

describe('buildPartCard (Coached rail)', () => {
  it('shows up to 2 distinct words and 1 pattern, no numbers', () => {
    const { evidence, turns } = fixture();
    const report = buildExamPronunciationReport({ turns, evidence });
    const card = buildPartCard(report.parts[1]);
    expect(card).toEqual({ part: 'topic1', words: ['souvent', 'mes'], pattern: expect.objectContaining({ category: 'nasalVowel' }) });
    expect(JSON.stringify(card, (_k, v) => (typeof v === 'number' ? '<number>' : v))).not.toContain('<number>');
  });

  it('is empty when nothing was reported', () => {
    const { evidence, turns } = fixture();
    const report = buildExamPronunciationReport({ turns, evidence });
    expect(buildPartCard(report.parts[2])).toEqual({ part: 'topic2', words: [], pattern: null });
  });
});
