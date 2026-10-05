// @vitest-environment jsdom
/**
 * Exam-pronunciation Batch 6: the report's Pronunciation section on
 * ExamResults. The real hook runs against a mocked Batch 5 client, so this
 * covers the whole surface: opt-in only, marks never wait on it, every state
 * sentence, the transcript highlights, word playback and the practice link —
 * and that nothing on it reads as a mark, band or score.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamResults } from '../ExamResults';
import type { EnvelopeView } from '../../../domain/igcse/envelope/envelopeView';
import type { ConductLogEntry } from '../../../domain/igcse/session/types';
import type { SessionPart, SessionTranscript } from '../../../domain/igcse/stt/types';
import { claimMentionsMarkOrBand } from '../../../domain/examFeedback/shared/markClaimFilter';
import { bad, ev, turn } from '../../../domain/examPronunciation/__tests__/evidenceFixture';
import { clearAllExamAudio, putTurnAudio } from '../../../services/exam/pronunciation/examAudioStore';
import type { PartAnalysis, TurnOutcome } from '../../../services/exam/pronunciation/client';
import {
  useExamPronunciation,
  type PronunciationClient,
  type UseExamPronunciation,
} from '../../../features/exam/pronunciation/useExamPronunciation';
import { PRONUNCIATION_STATE_MESSAGE } from '../../../features/exam/pronunciation/messages';
import { RP_MARK_2 } from '../../../domain/igcse/canonical';

const tts = vi.hoisted(() => ({ voice: true, speak: vi.fn(async () => {}) }));
vi.mock('../../../services/tts/ttsService', () => ({
  TTS: {
    isSupported: () => true,
    hasFrenchVoice: () => tts.voice,
    speak: tts.speak,
    stop: vi.fn(),
  },
}));

const clips = vi.hoisted(() => ({ canPlay: true, play: vi.fn(async () => true), stop: vi.fn() }));
vi.mock('../../../features/exam/pronunciation/playClip', () => ({
  canPlayClips: () => clips.canPlay,
  playClip: clips.play,
  stopClip: clips.stop,
}));

const SESSION = 'session-pron';
const TRANSCRIPT = { sessionId: SESSION, utterances: [], stt: { provider: 'session-engine' } } as unknown as SessionTranscript;

function envelope(): EnvelopeView {
  return {
    attemptId: 'attempt-pron',
    sessionId: SESSION,
    scoredAt: '2026-10-05T00:00:00.000Z',
    contentProvenance: 'original-practice',
    versions: {
      envelopeSchemaVersion: 'envelope-v0.4',
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'e',
      evidenceDetectorVersion: 'd',
      scoringPromptVersion: 'p',
      guardrailsVersion: 'g',
      calibrationVersion: 'none',
      gradeBoundarySeries: 'none',
    },
    llm: { provider: 'gemini', model: 'm', selfConsistencyRuns: 1 },
    transcriptConfidence: { meanWordConfidence: 1, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0, userCorrected: false },
    total: 27,
    criteria: [
      { criterion: 'rolePlayTask', taskId: 'rp1', mark: 2, confidence: 'unassessed', justification: RP_MARK_2[0], evidenceSpans: [] },
      { criterion: 'communication', mark: 9, band: { min: 7, max: 9, label: 'Satisfactory' }, confidence: 'unassessed', justification: 'j', evidenceSpans: [] },
      { criterion: 'qualityOfLanguage', mark: 8, band: { min: 7, max: 9, label: 'Satisfactory' }, confidence: 'unassessed', justification: 'j', evidenceSpans: [], errors: [] },
    ],
    guardrailTriggers: [],
    evidenceGroups: [],
    typedTurnCount: 0,
  };
}

let seq = 0;
function examiner(part: SessionPart): ConductLogEntry {
  seq += 1;
  return { kind: 'examiner', seq, atS: seq, part, action: 'READ_MAIN', questionId: 'q', variant: 'main', text: 'Question ?', trigger: 'scripted' };
}
function candidate(part: SessionPart, transcript: string): ConductLogEntry {
  seq += 1;
  return { kind: 'candidate', seq, startS: seq, endS: seq + 1, part, questionId: 'q', transcript, wordCount: 5, requestedRepeat: false, relevant: true };
}
/** rolePlay: seq 2; topic1: seq 4 and 6; topic2: seq 8. */
function entries(): ConductLogEntry[] {
  seq = 0;
  return [
    examiner('rolePlay'), candidate('rolePlay', 'Je voudrais vingt euros'),
    examiner('topic1'), candidate('topic1', 'Je vais souvent au cinéma'),
    examiner('topic1'), candidate('topic1', 'Le pain est bon'),
    examiner('topic2'), candidate('topic2', 'Mon frère est grand'),
  ];
}

const EVIDENCE: Record<number, ReturnType<typeof turn>> = {
  2: turn(2, [ev('Je'), ev('voudrais'), bad('vingt', 10, { offsetMs: 1_000, durationMs: 400 }), ev('euros')], { pauseStats: { pausesOver2s: 1, longestPauseS: 2.6 } }, 'rolePlay'),
  4: turn(4, [ev('Je'), ev('vais'), bad('souvent', 12), ev('au'), ev('cinéma')], {}, 'topic1'),
  6: turn(6, [ev('Le'), bad('pain', 15), ev('est'), ev('bon')], {}, 'topic1'),
  8: turn(8, [ev('Mon'), ev('frère'), ev('est'), ev('grand')], {}, 'topic2'),
};

type Analyse = PronunciationClient['analysePart'];
type Fetch = PronunciationClient['fetchStoredEvidence'];

function succeeding(): Analyse {
  return vi.fn<Analyse>(async (args) => {
    const turns: TurnOutcome[] = [];
    for (const e of args.entries) {
      if (e.kind !== 'candidate' || e.part !== args.part) continue;
      const outcome: TurnOutcome = {
        turnKey: e.seq,
        status: 'done',
        evidence: EVIDENCE[e.seq],
        segments: [{ origStartS: 0, origEndS: 5, trimmedStartS: 0 }],
      };
      turns.push(outcome);
      args.onTurn?.(outcome);
    }
    return { part: args.part, state: 'done', turns } satisfies PartAnalysis;
  });
}

function refusing(state: PartAnalysis['state']): Analyse {
  return vi.fn<Analyse>(async (args) => ({ part: args.part, state, turns: [] }));
}

interface HarnessProps {
  enabled?: boolean;
  analyse: Analyse;
  fetchStored?: Fetch;
  log?: ConductLogEntry[];
  onHook?: (hook: UseExamPronunciation) => void;
}

function Harness({ enabled = true, analyse, fetchStored, log, onHook }: HarnessProps) {
  const entriesRef = log ?? entries();
  const pronunciation = useExamPronunciation({
    enabled,
    getSessionId: () => SESSION,
    getEntries: () => entriesRef,
    recognizer: 'webspeech',
    client: {
      analysePart: analyse,
      fetchStoredEvidence: fetchStored ?? vi.fn<Fetch>(async () => ({ state: 'done', evidence: [] })),
    },
  });
  onHook?.(pronunciation);
  return (
    <MemoryRouter>
      <ExamResults
        transcript={TRANSCRIPT}
        envelopeView={envelope()}
        scoringError={null}
        onRetryScoring={vi.fn()}
        onRetake={vi.fn()}
        onHome={vi.fn()}
        coached={false}
        railEntries={[]}
        requestFeedback={() => new Promise(() => {})}
        pronunciation={pronunciation}
      />
    </MemoryRouter>
  );
}

/** Puts a recording in memory for every speech turn, as a finished exam would have. */
function recordAllTurns() {
  for (const key of [2, 4, 6, 8]) putTurnAudio(SESSION, key, new Blob(['audio'], { type: 'audio/webm' }));
}

function section() {
  return screen.getByTestId('exam-pronunciation');
}
/** Everything on the page except the pronunciation section: the total, every criterion mark, the examiner report. */
function pageOutsideSection(): string {
  const clone = document.body.cloneNode(true) as HTMLElement;
  clone.querySelector('[data-testid="exam-pronunciation"]')?.remove();
  return clone.textContent ?? '';
}

beforeEach(() => {
  clearAllExamAudio();
  tts.voice = true;
  tts.speak.mockClear();
  clips.canPlay = true;
  clips.play.mockClear();
});
afterEach(() => {
  cleanup();
  clearAllExamAudio();
});

describe('ExamResults — pronunciation section (Batch 6)', () => {
  it('renders nothing for an account that is not enabled, and asks nobody for anything', () => {
    recordAllTurns();
    const analyse = succeeding();
    render(<Harness enabled={false} analyse={analyse} />);
    expect(screen.queryByTestId('exam-pronunciation')).toBeNull();
    expect(screen.queryByText('Analyse my pronunciation')).toBeNull();
    expect(analyse).not.toHaveBeenCalled();
  });

  it('renders nothing when ExamResults is not given the pronunciation prop (existing callers)', () => {
    render(
      <ExamResults
        transcript={TRANSCRIPT}
        envelopeView={envelope()}
        scoringError={null}
        onRetryScoring={vi.fn()}
        onRetake={vi.fn()}
        onHome={vi.fn()}
        coached={false}
        railEntries={[]}
        requestFeedback={() => new Promise(() => {})}
      />,
    );
    expect(screen.queryByTestId('exam-pronunciation')).toBeNull();
  });

  it('Exam Sim: shows one button after the marks and analyses nothing until it is tapped', () => {
    recordAllTurns();
    const analyse = succeeding();
    render(<Harness analyse={analyse} />);
    expect(screen.getByText('27')).not.toBeNull();
    expect(within(section()).getByRole('button', { name: 'Analyse my pronunciation' })).not.toBeNull();
    expect(analyse).not.toHaveBeenCalled();
    // after the marks and the examiner report, never inside either
    const marks = screen.getByText(/Marks — Unvalidated Estimate/).closest('div.rounded-xl')!;
    expect(marks.contains(section())).toBe(false);
    expect(marks.compareDocumentPosition(section()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('exam-feedback').compareDocumentPosition(section()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marks render before the section resolves, and are identical before and after it does', async () => {
    recordAllTurns();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow = vi.fn<Analyse>(async (args) => {
      await gate;
      return succeeding()(args);
    });
    render(<Harness analyse={slow} />);
    const before = pageOutsideSection();
    expect(before).toContain('27');
    expect(before).toContain('/40');
    fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
    await screen.findByText(PRONUNCIATION_STATE_MESSAGE.running);
    expect(pageOutsideSection()).toBe(before);
    release();
    await screen.findByTestId('pronunciation-part-rolePlay');
    expect(pageOutsideSection()).toBe(before);
  });

  it('tapping Analyse fills the report in part by part: highlighted words, patterns, fluency note, practice link', async () => {
    recordAllTurns();
    const analyse = succeeding();
    render(<Harness analyse={analyse} />);
    fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
    await screen.findByTestId('pronunciation-part-topic2');
    expect((analyse as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].part)).toEqual(['rolePlay', 'topic1', 'topic2']);

    const topic1 = screen.getByTestId('pronunciation-part-topic1');
    const highlighted = within(topic1).getAllByRole('button').map((b) => b.textContent);
    expect(highlighted).toEqual(['souvent', 'pain']);
    // topic 2 was analysed and nothing was reported
    expect(within(screen.getByTestId('pronunciation-part-topic2')).getByText(/Nothing stood out/)).not.toBeNull();

    const patterns = screen.getByTestId('pronunciation-patterns');
    expect(within(patterns).getByText('Nasal vowels')).not.toBeNull();
    expect(within(patterns).getByText('Inferred')).not.toBeNull();
    expect(within(patterns).getByText('vingt, souvent, pain')).not.toBeNull();
    expect(screen.getByTestId('pronunciation-fluency').textContent).toContain('more than 2 seconds');
    expect(screen.getByRole('link', { name: /Accent Analyzer/ }).getAttribute('href')).toBe('/accent-analyzer');
    // the button is gone once everything is analysed
    expect(within(section()).queryByRole('button', { name: 'Analyse my pronunciation' })).toBeNull();
  });

  it('the section never reads as a mark, band, grade or score and shows no N/N', async () => {
    recordAllTurns();
    render(<Harness analyse={succeeding()} />);
    fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
    await screen.findByTestId('pronunciation-part-topic2');
    const text = section().textContent ?? '';
    // the standing "never changes your marks" reassurance is the only mention
    const withoutReassurance = text.replace('It never changes your marks.', '');
    expect(claimMentionsMarkOrBand(withoutReassurance)).toBe(false);
    expect(text).not.toMatch(/\d+\s*\/\s*\d+/);
    expect(text).not.toMatch(/accuracy|percent|%/i);
  });

  describe('word playback', () => {
    async function analyseAndSelect(word: string) {
      recordAllTurns();
      render(<Harness analyse={succeeding()} />);
      fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
      await screen.findByTestId('pronunciation-part-rolePlay');
      fireEvent.click(within(section()).getByRole('button', { name: word }));
      return screen.getByTestId('pronunciation-word-panel');
    }

    it('You plays the word’s range from the recording that is still in memory; Model speaks it', async () => {
      const panel = await analyseAndSelect('vingt');
      fireEvent.click(within(panel).getByRole('button', { name: /You/ }));
      await waitFor(() => expect(clips.play).toHaveBeenCalledTimes(1));
      const [blob, clip] = clips.play.mock.calls[0] as unknown as [Blob, { startS: number; endS: number }];
      expect(blob.size).toBeGreaterThan(0);
      expect(clip.startS).toBeCloseTo(1.0 - 0.12);
      expect(clip.endS).toBeCloseTo(1.4 + 0.12);
      fireEvent.click(within(panel).getByRole('button', { name: /Model/ }));
      await waitFor(() => expect(tts.speak).toHaveBeenCalledWith('vingt'));
    });

    it('hides Model when there is no French voice', async () => {
      tts.voice = false;
      const panel = await analyseAndSelect('vingt');
      expect(within(panel).queryByRole('button', { name: /Model/ })).toBeNull();
      expect(within(panel).getByRole('button', { name: /You/ })).not.toBeNull();
    });

    it('says "Recording not kept" when the recording is gone (reopened report, idle timeout, sign-out)', async () => {
      recordAllTurns();
      render(<Harness analyse={succeeding()} />);
      fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
      await screen.findByTestId('pronunciation-part-rolePlay');
      clearAllExamAudio();
      fireEvent.click(within(section()).getByRole('button', { name: 'vingt' }));
      const panel = screen.getByTestId('pronunciation-word-panel');
      expect(within(panel).queryByRole('button', { name: /You/ })).toBeNull();
      expect(within(panel).getByText('Recording not kept')).not.toBeNull();
    });

    it('a second tap on the same word closes the panel', async () => {
      await analyseAndSelect('vingt');
      fireEvent.click(within(section()).getByRole('button', { name: 'vingt' }));
      expect(screen.queryByTestId('pronunciation-word-panel')).toBeNull();
    });
  });

  describe('states (each one sentence, never blocking)', () => {
    it.each([
      ['budget_exhausted', PRONUNCIATION_STATE_MESSAGE.budget_exhausted],
      ['daily_cap', PRONUNCIATION_STATE_MESSAGE.daily_cap],
      ['signed_out', PRONUNCIATION_STATE_MESSAGE.signed_out],
      ['not_enabled', PRONUNCIATION_STATE_MESSAGE.not_enabled],
    ] as const)('%s', async (state, sentence) => {
      recordAllTurns();
      render(<Harness analyse={refusing(state)} />);
      fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
      await screen.findByText(sentence);
      expect(within(section()).queryByRole('button', { name: 'Analyse my pronunciation' })).toBeNull();
      expect(screen.getByText('27')).not.toBeNull(); // the marks are untouched
    });

    it('consent_required shows the guardian notice, not a sign-in prompt', async () => {
      recordAllTurns();
      render(<Harness analyse={refusing('consent_required')} />);
      fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
      await screen.findByTestId('guardian-consent-notice');
      expect(screen.queryByText(PRONUNCIATION_STATE_MESSAGE.signed_out)).toBeNull();
    });

    it('failed shows a sentence and Try again re-runs the analysis', async () => {
      recordAllTurns();
      const analyse = vi.fn<Analyse>().mockImplementationOnce(refusing('failed')).mockImplementation(succeeding());
      render(<Harness analyse={analyse} />);
      fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
      await screen.findByText(PRONUNCIATION_STATE_MESSAGE.failed);
      fireEvent.click(within(section()).getByRole('button', { name: 'Try again' }));
      await screen.findByTestId('pronunciation-part-topic2');
      expect(screen.queryByText(PRONUNCIATION_STATE_MESSAGE.failed)).toBeNull();
    });

    it('no_audio: with no recordings in memory the button is disabled and says why', () => {
      const analyse = succeeding();
      render(<Harness analyse={analyse} />);
      expect(screen.getByText(PRONUNCIATION_STATE_MESSAGE.no_audio)).not.toBeNull();
      expect((within(section()).getByRole('button', { name: 'Analyse my pronunciation' }) as HTMLButtonElement).disabled).toBe(true);
      expect(analyse).not.toHaveBeenCalled();
    });

    it('not_enabled from the stored-evidence read replaces the button with the sentence', async () => {
      recordAllTurns();
      const fetchStored = vi.fn<Fetch>(async () => ({ state: 'not_enabled', evidence: [] }));
      render(<Harness analyse={succeeding()} fetchStored={fetchStored} />);
      await screen.findByText(PRONUNCIATION_STATE_MESSAGE.not_enabled);
      expect(within(section()).queryByRole('button', { name: 'Analyse my pronunciation' })).toBeNull();
    });

    it('a part that finished with nothing assessable says so', async () => {
      recordAllTurns();
      const analyse = vi.fn<Analyse>(async (args) => {
        const outcome: TurnOutcome = {
          turnKey: 2,
          status: 'done',
          evidence: turn(2, [ev('Je')], { couldNotAssess: true, couldNotAssessReason: 'low_confidence' }, 'rolePlay'),
        };
        if (args.part === 'rolePlay') args.onTurn?.(outcome);
        return { part: args.part, state: 'done', turns: [] };
      });
      render(<Harness analyse={analyse} />);
      fireEvent.click(within(section()).getByRole('button', { name: 'Analyse my pronunciation' }));
      await screen.findByTestId('pronunciation-part-rolePlay');
      expect(within(screen.getByTestId('pronunciation-part-rolePlay')).getByText('Nothing could be analysed in this part.')).not.toBeNull();
    });
  });

  it('reopening a report shows the stored analysis with no analysis call and no recordings', async () => {
    const analyse = succeeding();
    const fetchStored = vi.fn<Fetch>(async () => ({ state: 'done', evidence: [EVIDENCE[2], EVIDENCE[4], EVIDENCE[6]] }));
    render(<Harness analyse={analyse} fetchStored={fetchStored} log={[]} />);
    await screen.findByTestId('pronunciation-part-topic1');
    expect(analyse).not.toHaveBeenCalled();
    expect(within(screen.getByTestId('pronunciation-part-topic1')).getAllByRole('button').map((b) => b.textContent)).toEqual(['souvent', 'pain']);
    fireEvent.click(within(section()).getByRole('button', { name: 'vingt' }));
    expect(within(screen.getByTestId('pronunciation-word-panel')).getByText('Recording not kept')).not.toBeNull();
  });
});
