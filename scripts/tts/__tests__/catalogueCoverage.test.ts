/**
 * The guard against silent misses (recorded-voices plan §4.4): a line the
 * catalogue lacks is never recorded, and the app quietly falls back to the
 * browser voice. So this drives the real conduct engine through whole exams —
 * every fixture set, both modes, many candidate behaviours (developed and
 * short answers, silences, repeat requests, skips, clarification hints) — and
 * requires every non-empty `action.text` it emits to be in the catalogue.
 *
 * No exceptions are allowed today: the engine never composes text (a REPEAT
 * re-reads the authored prompt verbatim, exam-conduct §8, and further
 * questions are authored only). If it ever does, the composed line falls back
 * to the browser voice and must be listed here as an explicit exception.
 */

import { describe, expect, it } from 'vitest';
import { collectLines } from '../collectLines';
import { OFFLINE_FIXTURES } from '../../../src/data/exam/bank/fixtures';
import { toSessionQuestionSet } from '../../../src/data/exam/bank/adapter';
import { initConductEngineState, startConduct, step } from '../../../src/domain/igcse/session/conductEngine';
import type {
  CandidateTurnResult,
  ConductHint,
  ConductMode,
  ExaminerAction,
  ExaminerActionKind,
  SessionQuestionSet,
} from '../../../src/domain/igcse/session/types';
import {
  GREETING_TEXT,
  ROLE_PLAY_FINISHED_TEXT,
  TOPIC1_ANNOUNCEMENT_TEXT,
  TOPIC2_ANNOUNCEMENT_TEXT,
  topicAnnouncementText,
} from '../../../src/screens/exam/examAnnouncements';
import { QUESTIONS } from '../../../src/data/questions';
import { LISTENING_QUESTIONS } from '../../../src/data/listeningQuestions';
import { SHADOWING_PHRASES } from '../../../src/data/shadowingPhrases';
import { normalizeSpokenText } from '../../../src/services/tts/voiceKey';
import { BENCHMARK_SENTENCES } from '../../../src/domain/pronunciation/lab/benchmark';
import { splitSentences } from '../../../src/domain/pronunciation/lab/sentences';
import { guideTexts, isRecordableWord } from '../../../src/domain/pronunciation/lab/lexicon';
import { MINIMAL_PAIRS } from '../../../src/domain/pronunciation/lab/minimalPairs';
import { SOUND_TIPS } from '../../../src/domain/pronunciation/lab/tips';
import { tokenizeSentence, watchOutFor, wordPlayTexts } from '../../../src/domain/pronunciation/lab/textFeatures';

const CATALOGUE = collectLines();
const KEYS = new Set(CATALOGUE.map((l) => normalizeSpokenText(l.text)));

type Behaviour = 'developed' | 'short' | 'silence' | 'repeat' | 'skip' | 'clarify';

interface Turn {
  result: CandidateTurnResult;
  conductHint?: ConductHint;
  /** Session clock advance for this turn (examiner speech + the answer). */
  gapS: number;
}

function turnFor(behaviour: Behaviour, gapS: number): Turn {
  const base: CandidateTurnResult = {
    didRespond: true,
    relevant: true,
    transcript: '',
    wordCount: 0,
    responseDurationS: 0,
    requestedRepeat: false,
  };
  switch (behaviour) {
    case 'developed':
      return { result: { ...base, transcript: 'je vais souvent au parc', wordCount: 30, responseDurationS: 30 }, gapS };
    case 'short':
      return { result: { ...base, transcript: 'oui', wordCount: 1, responseDurationS: 1 }, gapS };
    case 'silence':
      return { result: { ...base, didRespond: false, relevant: false }, gapS };
    case 'repeat':
      return { result: { ...base, didRespond: false, relevant: false, requestedRepeat: true }, gapS };
    case 'skip':
      return { result: { ...base, didRespond: false, relevant: false, skipConfirmed: true }, gapS };
    case 'clarify':
      return { result: { ...base, transcript: 'pardon ?', wordCount: 1, responseDurationS: 1 }, conductHint: 'clarification_request', gapS };
  }
}

/** Deterministic PRNG (mulberry32), so a failure reproduces from its seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs one whole exam; `next` picks each candidate turn. Returns every examiner action. */
function runExam(set: SessionQuestionSet, mode: ConductMode, next: (i: number) => Turn): ExaminerAction[] {
  let state = initConductEngineState(set, { mode });
  const started = startConduct(set, state);
  state = started.state;
  const actions = [...started.actions];
  let clockS = 0;
  for (let i = 0; state.phase.kind !== 'complete'; i++) {
    if (i > 400) throw new Error(`${set.questionSetId}/${mode}: exam did not finish`);
    const turn = next(i);
    clockS += turn.gapS;
    const r = step(set, state, { kind: 'candidateTurn', result: turn.result, conductHint: turn.conductHint, clockS });
    state = r.state;
    actions.push(...r.actions);
  }
  return actions;
}

const BEHAVIOURS: Behaviour[] = ['developed', 'short', 'silence', 'repeat', 'skip', 'clarify'];
const SEEDS_PER_RUN = 25;

function scripted(set: SessionQuestionSet, mode: ConductMode): ExaminerAction[][] {
  const runs: ExaminerAction[][] = [
    // Fast developed answers: the conversation stays under 3½ min, so Exam Sim asks both further questions.
    runExam(set, mode, () => turnFor('developed', 5)),
    // Brief answers: extension prompts.
    runExam(set, mode, () => turnFor('short', 5)),
    // Silence everywhere: every repeat, every alternative (and its repeat).
    runExam(set, mode, () => turnFor('silence', 10)),
    // Repeat requests, then silence: the alternative's own parts.
    runExam(set, mode, (i) => turnFor(i % 2 === 0 ? 'repeat' : 'silence', 10)),
    // Fail Q3–Q5 mains into their alternatives, then answer the alternative's parts.
    runExam(set, mode, (i) => turnFor(i % 3 === 2 ? 'short' : 'silence', 8)),
  ];
  for (let seed = 1; seed <= SEEDS_PER_RUN; seed++) {
    const random = rng(seed * 7919 + (mode === 'coached' ? 1 : 0));
    runs.push(
      runExam(set, mode, () => turnFor(BEHAVIOURS[Math.floor(random() * BEHAVIOURS.length)], 3 + Math.floor(random() * 40))),
    );
  }
  return runs;
}

describe('recorded-voices catalogue coverage', () => {
  const sets = Object.values(OFFLINE_FIXTURES);
  const modes: ConductMode[] = ['examSim', 'coached'];
  const kindsSeen = new Set<ExaminerActionKind>();

  for (const authored of sets) {
    for (const mode of modes) {
      it(`${authored.questionSetId} (${mode}): every line the conduct engine says is catalogued`, () => {
        const set = toSessionQuestionSet(authored);
        const missing = new Set<string>();
        for (const actions of scripted(set, mode)) {
          for (const action of actions) {
            kindsSeen.add(action.kind);
            const text = action.text?.trim();
            if (text && !KEYS.has(normalizeSpokenText(text))) missing.add(text);
          }
        }
        expect([...missing]).toEqual([]);
      });
    }

    it(`${authored.questionSetId}: the UI's setup and both named topic announcements are catalogued`, () => {
      const { rolePlay, topic1, topic2 } = authored.content;
      for (const text of [
        rolePlay.setup,
        topicAnnouncementText('topic1', topic1.title),
        topicAnnouncementText('topic2', topic2.title),
      ]) {
        expect(KEYS.has(normalizeSpokenText(text)), text).toBe(true);
      }
    });
  }

  it('the runs reach every kind of examiner line (so the check above is not vacuous)', () => {
    for (const kind of ['READ_MAIN', 'REPEAT', 'READ_ALTERNATIVE', 'EXTENSION_PROMPT', 'FURTHER_QUESTION', 'TRANSITION', 'END'] as const) {
      expect(kindsSeen.has(kind), kind).toBe(true);
    }
  });

  it('catalogues the greeting and the role-play-finished line', () => {
    expect(KEYS.has(normalizeSpokenText(GREETING_TEXT))).toBe(true);
    expect(KEYS.has(normalizeSpokenText(ROLE_PLAY_FINISHED_TEXT))).toBe(true);
  });

  it('catalogues the unnamed topic announcements (spoken when the set title is unknown, e.g. a resume)', () => {
    for (const text of [TOPIC1_ANNOUNCEMENT_TEXT, TOPIC2_ANNOUNCEMENT_TEXT, topicAnnouncementText('topic1', undefined), topicAnnouncementText('topic2', undefined)]) {
      expect(KEYS.has(normalizeSpokenText(text)), text).toBe(true);
    }
  });

  it('catalogues every Learn question (the text QuestionCard speaks)', () => {
    const learnKeys = new Set(QUESTIONS.map((q) => normalizeSpokenText(q.text)));
    expect(learnKeys.size).toBeGreaterThan(0);
    for (const key of learnKeys) expect(KEYS.has(key), key).toBe(true);
    // Every distinct question text is one line (a text shared with another source is listed once, under that source).
    const learnLines = CATALOGUE.filter((l) => learnKeys.has(normalizeSpokenText(l.text)));
    expect(learnLines).toHaveLength(learnKeys.size);
  });

  it('catalogues every Listening audioText and Shadowing phrase', () => {
    for (const q of LISTENING_QUESTIONS) expect(KEYS.has(normalizeSpokenText(q.audioText)), q.audioText).toBe(true);
    for (const p of SHADOWING_PHRASES) expect(KEYS.has(normalizeSpokenText(p.french)), p.french).toBe(true);
  });

  // ── Pronunciation Lab native audio (pronunciation-lab plan §4.2, Stage 4) ──

  const has = (text: string) => KEYS.has(normalizeSpokenText(text));

  it('catalogues every Learn model answer, sentence by sentence (the Lab practises one sentence at a time)', () => {
    let sentences = 0;
    for (const q of QUESTIONS) {
      for (const sentence of splitSentences(q.modelAnswer)) {
        sentences += 1;
        expect(has(sentence), `${q.id}: ${sentence}`).toBe(true);
      }
    }
    expect(sentences).toBeGreaterThan(QUESTIONS.length);
    expect(CATALOGUE.some((l) => l.source === 'lab-sentences')).toBe(true);
  });

  it('catalogues every word ▶ Native can ask for in a model answer or question: wordPlayTexts and "watch out for" chips', () => {
    const missing = new Set<string>();
    for (const q of QUESTIONS) {
      for (const sentence of [...splitSentences(q.modelAnswer), q.text]) {
        tokenizeSentence(sentence).forEach((_, i) => {
          for (const text of wordPlayTexts(sentence, i)) if (isRecordableWord(text) && !has(text)) missing.add(text);
        });
        for (const f of watchOutFor(sentence)) if (isRecordableWord(f.playText) && !has(f.playText)) missing.add(f.playText);
      }
    }
    expect([...missing]).toEqual([]);
    // wordPlayTexts re-reads the sentence for every word, so this walks ~4,000 sentences slowly.
  }, 60_000);

  it('catalogues the monthly-check benchmark sentences and every word the check can play (Stage 6)', () => {
    const missing = new Set<string>();
    for (const sentence of BENCHMARK_SENTENCES) {
      if (!has(sentence)) missing.add(sentence);
      tokenizeSentence(sentence).forEach((_, i) => {
        for (const text of wordPlayTexts(sentence, i)) if (isRecordableWord(text) && !has(text)) missing.add(text);
      });
      for (const f of watchOutFor(sentence)) if (isRecordableWord(f.playText) && !has(f.playText)) missing.add(f.playText);
    }
    expect([...missing]).toEqual([]);
  });

  it('catalogues the sound guide: every example, guide minimal pair and ear-training word', () => {
    for (const tip of Object.values(SOUND_TIPS)) {
      for (const text of [...tip.examples, ...(tip.minimalPair ?? [])]) expect(has(text), text).toBe(true);
    }
    for (const pair of MINIMAL_PAIRS) for (const word of pair.words) expect(has(word), word).toBe(true);
    for (const text of guideTexts()) expect(has(text), text).toBe(true);
  });

  it('lists the Lab strings in the words-before-sentences order, so a run cut short has spent its time where it helps most', () => {
    const order = CATALOGUE.map((l) => l.source);
    const lastWord = order.lastIndexOf('lab-words');
    const firstSentence = order.indexOf('lab-sentences');
    expect(lastWord).toBeGreaterThan(-1);
    expect(firstSentence).toBeGreaterThan(lastWord);
  });

  it('keeps the recording budget inside Azure F0 (500k characters a month) with room for one more run', () => {
    const chars = CATALOGUE.reduce((n, l) => n + l.text.length, 0);
    expect(chars).toBeLessThan(450_000);
  });

  it('lists each line once and never an empty one', () => {
    const keys = CATALOGUE.map((l) => normalizeSpokenText(l.text));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain('');
  });
});
