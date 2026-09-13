// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { OnboardingPlacement } from '../OnboardingPlacement';

const dispatchMock = vi.fn();
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ state: {}, dispatch: dispatchMock }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ consentStatus: 'granted' }),
}));

let sttError: string | null = null;
let nextTranscript = 'Je vais bien, merci.';
const stopMock = vi.fn(async () => nextTranscript);
const startMock = vi.fn();
// RecordingPanel's button toggles onClick between recording.start (not
// recording) and the passed-in onStop (recording) based on isRecording. Uses
// a real useState (inside the mock, called from within the rendered
// component) so clicking "start" actually re-renders the panel into its
// "recording" visual state before the test clicks "stop" — a plain mutable
// module variable wouldn't trigger a re-render on its own.
// stop() intentionally does NOT flip isRecording back to false itself (the
// real useRecording only does that asynchronously, inside onstop/onend), so
// a rapid double-click on the mic button while "still recording" calls
// onStop twice — exactly the scenario the per-question submitted-flag guards.
// Set by the test right before a rapid-double-submit click sequence, to skip
// the "settle back to idle" flip that a real recognizer's onend does async.
let skipAutoSettle = false;
vi.mock('../../features/recording/useRecording', () => ({
  useRecording: () => {
    const [isRecording, setIsRecording] = useState(false);
    return {
      isRecording,
      elapsedTime: 0,
      waveData: [],
      transcript: nextTranscript,
      audioBlob: null,
      lastActivityAt: null,
      micLevel: {},
      start: () => { setIsRecording(true); return startMock(); },
      stop: async () => {
        const result = await stopMock();
        if (!skipAutoSettle) setIsRecording(false);
        return result;
      },
      audioBlobPromise: async () => null,
      sttSupported: true,
      sttError,
    };
  },
}));

vi.mock('../../components/SpeakingConsentGate', () => ({
  SpeakingConsentGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let feedbackImpl: () => Promise<unknown> = async () => ({
  scores: { overall: 7 },
  wordCount: 5,
});
const getAIFeedbackMock = vi.fn(() => feedbackImpl());
vi.mock('../../services/api/apiClient', () => ({
  getAIFeedback: () => getAIFeedbackMock(),
}));

vi.mock('../../services/coaching/diagnosticEngine', () => ({
  buildSkillContext: () => ({ sessionsAnalyzed: 0 }),
  detectAvoidance: () => [],
}));

const observeAttemptMock = vi.fn((input: { sessionId: string; mode: string }) => {
  void input;
  return {
    evidenceEvents: [{}],
    beliefSnapshot: { demands: {} },
    recommendation: {},
  };
});
vi.mock('../../services/coach/sessionOrchestrator', () => ({
  observeAttempt: (input: { sessionId: string; mode: string }) => observeAttemptMock(input),
}));

vi.mock('../../domain/learn/ability/deriveAbility', () => ({
  deriveAbility: vi.fn(() => ({ abilityScore: 5.0, overallConfidence: 0.5, measuredAnswers: 5 })),
}));

const storageSetRawMock = vi.fn();
vi.mock('../../services/persistence/storage', () => ({
  STORAGE_KEYS: { aim: 'frenchCoach_aim' },
  storageSetRaw: (...args: unknown[]) => storageSetRawMock(...args),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

function renderPlacement(searchSuffix = '') {
  return render(
    <MemoryRouter initialEntries={[`/onboarding/placement${searchSuffix}`]}>
      <Routes>
        <Route path="/onboarding/placement" element={<OnboardingPlacement />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function micButton() {
  const buttons = screen.getAllByRole('button');
  // The mic control is the only <button> without visible text content.
  return buttons.find((b) => b.textContent === '')!;
}

function recordAndStop() {
  fireEvent.click(micButton()); // start
  fireEvent.click(micButton()); // stop -> triggers handleStop
}

beforeEach(() => {
  sttError = null;
  nextTranscript = 'Je vais bien, merci.';
  skipAutoSettle = false;
  feedbackImpl = async () => ({ scores: { overall: 7 }, wordCount: 5 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OnboardingPlacement', () => {
  it('completing all 5 questions calls observeAttempt 5 times with mode diagnostic and the same sessionId, then writes aim and dispatches SET_AIM', async () => {
    renderPlacement('?returnTo=%2F');
    for (let i = 0; i < 5; i++) {
      recordAndStop();
      await waitFor(() => expect(observeAttemptMock).toHaveBeenCalledTimes(i + 1));
    }

    expect(observeAttemptMock).toHaveBeenCalledTimes(5);
    const sessionIds = observeAttemptMock.mock.calls.map((c) => c[0].sessionId);
    expect(new Set(sessionIds).size).toBe(1);
    for (const call of observeAttemptMock.mock.calls) {
      expect(call[0].mode).toBe('diagnostic');
    }

    await waitFor(() => expect(storageSetRawMock).toHaveBeenCalledWith('frenchCoach_aim', expect.any(String)));
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'SET_AIM', aim: expect.any(String) });
  });

  it('a rapid double-submit on one question results in exactly one observeAttempt call', async () => {
    skipAutoSettle = true;
    renderPlacement();
    fireEvent.click(micButton()); // start
    // Rapid double-submit: fire the stop button twice in the same tick,
    // before setStatus('submitting') from the first click has committed and
    // unmounted the button — the per-question submitted-flag guard must
    // still let only one observeAttempt through.
    const button = micButton();
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(observeAttemptMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(observeAttemptMock).toHaveBeenCalledTimes(1);
  });

  it('a persistent recording failure skips the question after retries without writing aim', async () => {
    sttError = 'not-allowed';
    nextTranscript = '';
    renderPlacement();

    for (let attempt = 0; attempt < 2; attempt++) {
      recordAndStop();
      await waitFor(() => screen.getByText(/that didn't record|question 2 of 5/i));
    }

    await waitFor(() => screen.getByText(/question 2 of 5/i));
    expect(observeAttemptMock).not.toHaveBeenCalled();
    expect(storageSetRawMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_AIM' }));
  });

  it('an unscored feedback question still calls observeAttempt once but does not advance to the next question', async () => {
    feedbackImpl = async () => ({ scores: { overall: 0 }, unscored: true, wordCount: 5 });
    renderPlacement();
    recordAndStop();
    await waitFor(() => expect(observeAttemptMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/question 1 of 5/i)).not.toBeNull();
  });

  it('skipping the whole diagnostic writes nothing and navigates to the returnTo destination', async () => {
    renderPlacement('?returnTo=%2Fduel%2Fabc123');
    fireEvent.click(screen.getByText('Skip diagnostic'));
    await waitFor(() => screen.getByTestId('location'));
    expect(screen.getByTestId('location').textContent).toBe('/duel/abc123');
    expect(observeAttemptMock).not.toHaveBeenCalled();
    expect(storageSetRawMock).not.toHaveBeenCalled();
  });
});
