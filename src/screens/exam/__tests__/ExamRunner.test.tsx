// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { ExamRunner } from '../ExamRunner';
import type { RecordingState } from '../../../features/recording/useRecording';

// jsdom has no canvas 2D context — ScrollingWaveform is an unrelated visual
// component here, not under test, so stub it out rather than pull in the
// canvas package.
vi.mock('../../../features/recording/ScrollingWaveform', () => ({
  ScrollingWaveform: () => null,
}));

// AuthContext backs ExamComposer's consent gate — not under test here, and
// every case below wants the composer's normal (non-gated) rendering.
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ consentStatus: 'confirmed' }),
}));

afterEach(() => {
  cleanup();
});

function baseRecording(overrides: Partial<RecordingState> = {}): RecordingState {
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
    ...overrides,
  };
}

const baseProps = {
  action: { kind: 'READ_MAIN', part: 'rolePlay', text: 'Bonjour', questionId: 'q1' } as never,
  entries: [],
  totalElapsedS: 0,
  turnBusy: false,
  onStartRecording: vi.fn(),
  onSubmitSpeech: vi.fn(),
  onSubmitText: vi.fn(),
  onRequestRepeat: vi.fn(),
  onExit: vi.fn(),
  voiceMuted: false,
  onToggleVoice: vi.fn(),
  onKeepTrying: vi.fn(),
  onSkipQuestion: vi.fn(),
};

describe('ExamRunner — reliability plan §2.4 transcription-failure banner', () => {
  it('shows the distinct transcription-failure panel, not the silent-skip one, when pendingTranscriptionFailure is set', () => {
    render(
      <ExamRunner
        {...baseProps}
        recording={baseRecording()}
        pendingSilentSkip={false}
        pendingTranscriptionFailure={true}
      />,
    );

    expect(screen.getByText(/We couldn.t transcribe your answer/)).not.toBeNull();
    expect(screen.queryByText(/We can.t hear you/)).toBeNull();
  });

  it('shows the silent-skip panel when only pendingSilentSkip is set', () => {
    render(
      <ExamRunner
        {...baseProps}
        recording={baseRecording()}
        pendingSilentSkip={true}
        pendingTranscriptionFailure={false}
      />,
    );

    expect(screen.getByText(/We can.t hear you/)).not.toBeNull();
    expect(screen.queryByText(/We couldn.t transcribe your answer/)).toBeNull();
  });

  it('shows the STT-unsupported banner (via the composer) when sttSupported is false and no failure is pending', () => {
    render(
      <ExamRunner
        {...baseProps}
        recording={baseRecording({ sttSupported: false })}
        pendingSilentSkip={false}
        pendingTranscriptionFailure={false}
      />,
    );

    expect(screen.getByText(/doesn.t support live speech transcription/)).not.toBeNull();
  });
});

/**
 * 0520 conduct plan, Batch 1 repros, fixed in Batch 3 (ExamRunner UI).
 */
describe('ExamRunner — 0520 conduct repros (fixed in Batch 3)', () => {
  const RP3_PART1 = 'Voulez-vous un aller simple ou un aller-retour ?';
  const RP3_PART2 = 'Y a-t-il une réduction pour les étudiants ?';

  it('exam-conduct §7: the second part of a two-part role-play task gets its own "part 2" label (Bug 1)', () => {
    render(
      <ExamRunner
        {...baseProps}
        action={{ kind: 'READ_MAIN', part: 'rolePlay', questionId: 'rp3', variant: 'main', text: RP3_PART2, trigger: 'scripted' }}
        entries={[
          { kind: 'examiner', seq: 5, atS: 40, part: 'rolePlay', action: 'READ_MAIN', questionId: 'rp3', variant: 'main', text: RP3_PART1, trigger: 'scripted' },
          { kind: 'candidate', seq: 6, startS: 42, endS: 45, part: 'rolePlay', questionId: 'rp3', transcript: 'Un aller-retour.', wordCount: 2, requestedRepeat: false, relevant: true },
          { kind: 'examiner', seq: 7, atS: 46, part: 'rolePlay', action: 'READ_MAIN', questionId: 'rp3', variant: 'main', text: RP3_PART2, trigger: 'scripted' },
        ]}
        taskProgress={{ index: 2, total: 5 }}
        rolePlayTitle="À la gare"
        recording={baseRecording()}
        pendingSilentSkip={false}
        pendingTranscriptionFailure={false}
      />,
    );
    expect(screen.getByText(/part 2/i)).not.toBeNull();
  });

  it('exam-conduct §10: Exam Sim counts down from the start of the current part, not the whole exam', () => {
    // Topic 2 started at 6:20 of the exam; it is now 6:40 → 3:40 of its 4:00 left.
    render(
      <ExamRunner
        {...baseProps}
        action={{ kind: 'READ_MAIN', part: 'topic2', questionId: 't2q1', variant: 'main', text: 'Question', trigger: 'scripted' }}
        entries={[
          { kind: 'examiner', seq: 30, atS: 380, part: 'topic2', action: 'READ_MAIN', questionId: 't2q1', variant: 'main', text: 'Question', trigger: 'scripted' },
        ]}
        totalElapsedS={400}
        recording={baseRecording()}
        pendingSilentSkip={false}
        pendingTranscriptionFailure={false}
      />,
    );
    expect(screen.getByText('3:40')).not.toBeNull();
  });

  it('exam-conduct §24: Coached has no time-based countdown', () => {
    render(
      <ExamRunner
        {...baseProps}
        action={{ kind: 'READ_MAIN', part: 'topic2', questionId: 't2q1', variant: 'main', text: 'Question', trigger: 'scripted' }}
        entries={[
          { kind: 'examiner', seq: 30, atS: 380, part: 'topic2', action: 'READ_MAIN', questionId: 't2q1', variant: 'main', text: 'Question', trigger: 'scripted' },
        ]}
        totalElapsedS={400}
        coached={true}
        recording={baseRecording()}
        pendingSilentSkip={false}
        pendingTranscriptionFailure={false}
      />,
    );
    expect(screen.queryByText('3:40')).toBeNull();
  });
});
