// @vitest-environment jsdom
// Exam-pronunciation plan Batch 2: Say-It-Again has no client consent gate
// (useAudioBlobRecorder), so the backend's 403 consent_required is mapped to
// the guardian copy — with a way on, never a trap.
import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const assessMock = vi.fn();
vi.mock('../../../../services/pronunciation/pronunciationClient', () => ({
  assessPronunciation: (...args: unknown[]) => assessMock(...args),
}));
vi.mock('../../../../services/telemetry/telemetryService', () => ({ track: vi.fn() }));
vi.mock('../../../../services/telemetry/localCounters', () => ({ incrementCounter: vi.fn() }));
vi.mock('../../../../services/tts/ttsService', () => ({ TTS: { speak: vi.fn() } }));
vi.mock('../../../recording/Waveform', () => ({ Waveform: () => null }));

let recording = false;
vi.mock('../../../recording/useAudioBlobRecorder', () => ({
  useAudioBlobRecorder: () => ({
    isRecording: recording,
    waveData: [],
    micLevel: {},
    start: vi.fn(async () => { recording = true; }),
    stop: vi.fn(async () => ({ blob: new Blob(['x'], { type: 'audio/wav' }), url: 'blob:x', waveSnapshot: [] })),
  }),
}));

import { SayItAgainCard } from '../SayItAgainCard';
import { ConsentRequiredError } from '../../../../lib/consentRequired';

afterEach(() => {
  cleanup();
  assessMock.mockReset();
  recording = false;
});

describe('SayItAgainCard — consent_required', () => {
  it('shows the guardian message, then Continue moves on', async () => {
    recording = true;
    assessMock.mockRejectedValue(new ConsentRequiredError());
    const onDone = vi.fn();
    render(<SayItAgainCard targetSentence="Je suis allé au cinéma." questionId="q1" onDone={onDone} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button').find(b => !b.getAttribute('aria-label'))!);
    });

    expect(screen.getByText("Waiting for your parent/guardian's OK")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('still advances straight on for any other failure', async () => {
    recording = true;
    assessMock.mockRejectedValue(new Error('timeout'));
    const onDone = vi.fn();
    render(<SayItAgainCard targetSentence="Je suis allé au cinéma." questionId="q1" onDone={onDone} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button').find(b => !b.getAttribute('aria-label'))!);
    });

    expect(onDone).toHaveBeenCalledOnce();
    expect(screen.queryByText("Waiting for your parent/guardian's OK")).toBeNull();
  });
});
