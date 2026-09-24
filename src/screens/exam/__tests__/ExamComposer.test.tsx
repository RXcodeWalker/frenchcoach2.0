// @vitest-environment jsdom
// W4 — dual mic/text input. The consent-pending case is the one the plan
// explicitly calls out: a guardian-pending under-13 account must still be
// able to type an answer even though the mic control is gated away
// (Phase 1.6 Part C / ADR 0006 — SpeakingConsentGate never blocks typing).

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ExamComposer } from '../ExamComposer';
import type { RecordingState } from '../../../features/recording/useRecording';

vi.mock('../../../features/recording/ScrollingWaveform', () => ({
  ScrollingWaveform: () => null,
}));

const useAuthMock = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

afterEach(() => {
  cleanup();
  useAuthMock.mockReset();
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

describe('ExamComposer', () => {
  it('shows the mic button when consent is granted', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'granted' });
    render(
      <ExamComposer
        recording={baseRecording()}
        disabled={false}
        onStartRecording={vi.fn()}
        onSubmitSpeech={vi.fn()}
        onSubmitText={vi.fn()}
        coached={true}
      />,
    );
    expect(screen.getByLabelText('Start recording')).not.toBeNull();
  });

  it('consent-pending: hides the mic control and shows the guardian-wait message, but keeps the text field usable', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'pending' });
    const onSubmitText = vi.fn();
    const onStartRecording = vi.fn();
    render(
      <ExamComposer
        recording={baseRecording()}
        disabled={false}
        onStartRecording={onStartRecording}
        onSubmitSpeech={vi.fn()}
        onSubmitText={onSubmitText}
        coached={true}
      />,
    );

    expect(screen.queryByLabelText('Start recording')).toBeNull();
    expect(screen.getByText(/Waiting for your parent\/guardian/)).not.toBeNull();

    const textarea = screen.getByPlaceholderText('Écris ta réponse…');
    fireEvent.change(textarea, { target: { value: 'Bonjour, je vais bien.' } });
    fireEvent.click(screen.getByLabelText('Send'));

    expect(onSubmitText).toHaveBeenCalledWith('Bonjour, je vais bien.');
    expect(onStartRecording).not.toHaveBeenCalled();
  });

  it('submits typed text on Enter and clears the field, but not on Shift+Enter', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'granted' });
    const onSubmitText = vi.fn();
    render(
      <ExamComposer
        recording={baseRecording()}
        disabled={false}
        onStartRecording={vi.fn()}
        onSubmitSpeech={vi.fn()}
        onSubmitText={onSubmitText}
        coached={true}
      />,
    );

    const textarea = screen.getByPlaceholderText('Écris ta réponse…') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Salut' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmitText).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmitText).toHaveBeenCalledWith('Salut');
    expect(textarea.value).toBe('');
  });

  it('typing while recording stops the recorder in the background', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'granted' });
    const stop = vi.fn().mockResolvedValue('');
    render(
      <ExamComposer
        recording={baseRecording({ isRecording: true, stop })}
        disabled={false}
        onStartRecording={vi.fn()}
        onSubmitSpeech={vi.fn()}
        onSubmitText={vi.fn()}
        coached={true}
      />,
    );

    const textarea = screen.getByPlaceholderText('Écris ta réponse…');
    fireEvent.change(textarea, { target: { value: 'j' } });
    expect(stop).toHaveBeenCalled();
  });

  it('Exam Sim (coached=false): hides the keyboard entirely, mic only', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'granted' });
    render(
      <ExamComposer
        recording={baseRecording()}
        disabled={false}
        onStartRecording={vi.fn()}
        onSubmitSpeech={vi.fn()}
        onSubmitText={vi.fn()}
        coached={false}
      />,
    );

    expect(screen.getByLabelText('Start recording')).not.toBeNull();
    expect(screen.queryByPlaceholderText('Écris ta réponse…')).toBeNull();
    expect(screen.queryByLabelText('Send')).toBeNull();
  });

  it('Exam Sim + guardian consent pending: no mic, no keyboard, tells the candidate to switch modes', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'pending' });
    render(
      <ExamComposer
        recording={baseRecording()}
        disabled={false}
        onStartRecording={vi.fn()}
        onSubmitSpeech={vi.fn()}
        onSubmitText={vi.fn()}
        coached={false}
      />,
    );

    expect(screen.queryByLabelText('Start recording')).toBeNull();
    expect(screen.queryByPlaceholderText('Écris ta réponse…')).toBeNull();
    expect(screen.getByText(/Exam Sim needs a microphone/)).not.toBeNull();
  });
});
