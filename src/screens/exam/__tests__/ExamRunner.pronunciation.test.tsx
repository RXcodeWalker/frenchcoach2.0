// @vitest-environment jsdom
/**
 * Exam-pronunciation Batch 6: the Coached rail's end-of-part card, through
 * ExamRunner (desktop rail and the mobile sheet). A card appears only once a
 * part has ended, only in Coached, only for an enabled account; it shows up to
 * 2 words and 1 pattern and never a number; and nothing is sent until the
 * candidate taps the button.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ExamRunner } from '../ExamRunner';
import type { RecordingState } from '../../../features/recording/useRecording';
import type { ConductLogEntry } from '../../../domain/igcse/session/types';
import type { SessionPart } from '../../../domain/igcse/stt/types';
import { bad, ev, turn } from '../../../domain/examPronunciation/__tests__/evidenceFixture';
import { clearAllExamAudio, putTurnAudio } from '../../../services/exam/pronunciation/examAudioStore';
import type { PartAnalysis, TurnOutcome } from '../../../services/exam/pronunciation/client';
import {
  useExamPronunciation,
  type PronunciationClient,
  type UseExamPronunciation,
} from '../../../features/exam/pronunciation/useExamPronunciation';
import { PRONUNCIATION_STATE_MESSAGE } from '../../../features/exam/pronunciation/messages';

vi.mock('../../../features/recording/ScrollingWaveform', () => ({ ScrollingWaveform: () => null }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'confirmed' }) }));

const SESSION = 'session-card';

function recording(): RecordingState {
  return {
    isRecording: false,
    elapsedTime: 0,
    waveData: [],
    transcript: '',
    audioBlob: null,
    lastActivityAt: null,
    micLevel: { attach: vi.fn(), detach: vi.fn(), subscribe: vi.fn(() => () => {}) } as unknown as RecordingState['micLevel'],
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(''),
    audioBlobPromise: vi.fn().mockResolvedValue(null),
    sttSupported: true,
    sttError: null,
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
/** rolePlay: seq 2 (three flagged words); topic1: seq 4 (nothing flagged). */
const LOG = (() => {
  seq = 0;
  return [
    examiner('rolePlay'), candidate('rolePlay', 'Je voudrais vingt pains souvent'),
    examiner('topic1'), candidate('topic1', 'Je vais au cinéma'),
  ];
})();

const EVIDENCE = {
  2: turn(2, [ev('Je'), ev('voudrais'), bad('vingt', 10), bad('pains', 12), bad('souvent', 14)], {}, 'rolePlay'),
  4: turn(4, [ev('Je'), ev('vais'), ev('au'), ev('cinéma')], {}, 'topic1'),
} as const;

type Analyse = PronunciationClient['analysePart'];

function succeeding(): Analyse {
  return vi.fn<Analyse>(async (args) => {
    const turns: TurnOutcome[] = [];
    for (const e of args.entries) {
      if (e.kind !== 'candidate' || e.part !== args.part) continue;
      const outcome: TurnOutcome = { turnKey: e.seq, status: 'done', evidence: EVIDENCE[e.seq as 2 | 4] };
      turns.push(outcome);
      args.onTurn?.(outcome);
    }
    return { part: args.part, state: 'done', turns } satisfies PartAnalysis;
  });
}

function refusing(state: PartAnalysis['state']): Analyse {
  return vi.fn<Analyse>(async (args) => ({ part: args.part, state, turns: [] }));
}

let hook!: UseExamPronunciation;

function Harness({ analyse, enabled = true, coached = true }: { analyse: Analyse; enabled?: boolean; coached?: boolean }) {
  hook = useExamPronunciation({
    enabled,
    getSessionId: () => SESSION,
    getEntries: () => LOG,
    recognizer: 'webspeech',
    client: { analysePart: analyse, fetchStoredEvidence: vi.fn(async () => ({ state: 'done' as const, evidence: [] })) },
  });
  return (
    <ExamRunner
      action={{ kind: 'READ_MAIN', part: 'topic1', text: 'Bonjour', questionId: 'q1' } as never}
      entries={LOG}
      totalElapsedS={0}
      recording={recording()}
      turnBusy={false}
      onStartRecording={vi.fn()}
      onSubmitSpeech={vi.fn()}
      onSubmitText={vi.fn()}
      onRequestRepeat={vi.fn()}
      onExit={vi.fn()}
      voiceMuted={false}
      onToggleVoice={vi.fn()}
      pendingSilentSkip={false}
      pendingTranscriptionFailure={false}
      onKeepTrying={vi.fn()}
      onSkipQuestion={vi.fn()}
      coached={coached}
      pronunciation={hook}
    />
  );
}

function recordTurns() {
  for (const key of [2, 4]) putTurnAudio(SESSION, key, new Blob(['audio']));
}

/** The desktop rail copy (the mobile sheet is closed until opened). */
function card(part: SessionPart) {
  return screen.getByTestId(`pronunciation-card-${part}`);
}

beforeEach(() => clearAllExamAudio());
afterEach(() => {
  cleanup();
  clearAllExamAudio();
});

describe('ExamRunner — Coached pronunciation card (Batch 6)', () => {
  it('shows no card until a part has ended', () => {
    recordTurns();
    render(<Harness analyse={succeeding()} />);
    expect(screen.queryByTestId('pronunciation-card-rolePlay')).toBeNull();
    expect(screen.queryByText('Analyse my pronunciation')).toBeNull();
  });

  it('one card appears when a part ends, with a button — and nothing is sent', () => {
    recordTurns();
    const analyse = succeeding();
    render(<Harness analyse={analyse} />);
    act(() => hook.markPartEnded('rolePlay'));
    expect(within(card('rolePlay')).getByText('Role play done')).not.toBeNull();
    expect(within(card('rolePlay')).getByRole('button', { name: 'Analyse my pronunciation' })).not.toBeNull();
    expect(screen.queryByTestId('pronunciation-card-topic1')).toBeNull();
    expect(analyse).not.toHaveBeenCalled();
    // the live-corrections rail is still there around it
    expect(screen.getAllByText(/Examiner commentary will appear here/).length).toBeGreaterThan(0);
  });

  it('a card per ended part, in order, never per answer', () => {
    recordTurns();
    render(<Harness analyse={succeeding()} />);
    act(() => hook.markPartEnded('rolePlay'));
    act(() => hook.markPartEnded('topic1'));
    const ids = screen.getAllByTestId(/^pronunciation-card-/).map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual(['pronunciation-card-rolePlay', 'pronunciation-card-topic1']);
  });

  it('tapping Analyse shows at most 2 words and 1 pattern, never a number', async () => {
    recordTurns();
    const analyse = succeeding();
    render(<Harness analyse={analyse} />);
    act(() => hook.markPartEnded('rolePlay'));
    fireEvent.click(within(card('rolePlay')).getByRole('button', { name: 'Analyse my pronunciation' }));
    await within(card('rolePlay')).findByText(/Worth another listen/);
    const text = card('rolePlay').textContent ?? '';
    expect(analyse).toHaveBeenCalledTimes(1);
    expect((analyse as ReturnType<typeof vi.fn>).mock.calls[0][0].part).toBe('rolePlay');
    expect(within(card('rolePlay')).getByText('vingt, pains')).not.toBeNull(); // 3 flagged, 2 shown
    expect(text).not.toContain('souvent');
    expect(text).toContain('Nasal vowels');
    expect(text).not.toMatch(/\d/);
  });

  it('a part with nothing flagged says nothing stood out', async () => {
    recordTurns();
    render(<Harness analyse={succeeding()} />);
    act(() => hook.markPartEnded('topic1'));
    fireEvent.click(within(card('topic1')).getByRole('button', { name: 'Analyse my pronunciation' }));
    await within(card('topic1')).findByText(/Nothing stood out/);
  });

  it('is never shown in Exam Sim, even if a part has ended', () => {
    recordTurns();
    render(<Harness analyse={succeeding()} coached={false} />);
    act(() => hook.markPartEnded('rolePlay'));
    expect(screen.queryByTestId('pronunciation-card-rolePlay')).toBeNull();
    expect(screen.getByText(/Sealed until you submit/)).not.toBeNull();
  });

  it('is never shown for an account that is not enabled', () => {
    recordTurns();
    render(<Harness analyse={succeeding()} enabled={false} />);
    act(() => hook.markPartEnded('rolePlay'));
    expect(screen.queryByTestId('pronunciation-card-rolePlay')).toBeNull();
  });

  it('disables the button with a reason when the part has no recording in memory', () => {
    render(<Harness analyse={succeeding()} />);
    act(() => hook.markPartEnded('rolePlay'));
    expect(within(card('rolePlay')).getByText(/No recordings were kept for this part/)).not.toBeNull();
    expect((within(card('rolePlay')).getByRole('button', { name: 'Analyse my pronunciation' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    ['budget_exhausted', PRONUNCIATION_STATE_MESSAGE.budget_exhausted],
    ['daily_cap', PRONUNCIATION_STATE_MESSAGE.daily_cap],
    ['signed_out', PRONUNCIATION_STATE_MESSAGE.signed_out],
    ['not_enabled', PRONUNCIATION_STATE_MESSAGE.not_enabled],
  ] as const)('%s is one sentence on the card', async (state, sentence) => {
    recordTurns();
    render(<Harness analyse={refusing(state)} />);
    act(() => hook.markPartEnded('rolePlay'));
    fireEvent.click(within(card('rolePlay')).getByRole('button', { name: 'Analyse my pronunciation' }));
    await within(card('rolePlay')).findByText(sentence);
  });

  it('consent_required shows the guardian notice; failed offers Try again', async () => {
    recordTurns();
    const consent = render(<Harness analyse={refusing('consent_required')} />);
    act(() => hook.markPartEnded('rolePlay'));
    fireEvent.click(within(card('rolePlay')).getByRole('button', { name: 'Analyse my pronunciation' }));
    await within(card('rolePlay')).findByTestId('guardian-consent-notice');
    consent.unmount();

    const analyse = vi.fn<Analyse>().mockImplementationOnce(refusing('failed')).mockImplementation(succeeding());
    render(<Harness analyse={analyse} />);
    act(() => hook.markPartEnded('rolePlay'));
    fireEvent.click(within(card('rolePlay')).getByRole('button', { name: 'Analyse my pronunciation' }));
    await within(card('rolePlay')).findByText(PRONUNCIATION_STATE_MESSAGE.failed);
    fireEvent.click(within(card('rolePlay')).getByRole('button', { name: 'Try again' }));
    await within(card('rolePlay')).findByText(/Worth another listen/);
  });

  it('the mobile sheet shows the same card, from the same state', async () => {
    recordTurns();
    render(<Harness analyse={succeeding()} />);
    act(() => hook.markPartEnded('rolePlay'));
    expect(screen.getAllByTestId('pronunciation-card-rolePlay')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Show live corrections' }));
    const copies = screen.getAllByTestId('pronunciation-card-rolePlay');
    expect(copies).toHaveLength(2);
    fireEvent.click(within(copies[1]).getByRole('button', { name: 'Analyse my pronunciation' }));
    await within(copies[1]).findByText(/Worth another listen/);
    // both copies read the one result
    expect(within(screen.getAllByTestId('pronunciation-card-rolePlay')[0]).getByText(/Worth another listen/)).not.toBeNull();
  });
});
