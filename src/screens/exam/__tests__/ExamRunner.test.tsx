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
  elapsedS: 0,
  totalElapsedS: 0,
  onSubmitTurn: vi.fn(),
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

  it('shows the STT-unsupported banner when sttSupported is false and no failure is pending', () => {
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
