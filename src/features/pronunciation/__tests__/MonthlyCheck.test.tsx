// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { azureWord, scripted } from '../../../domain/pronunciation/lab/__tests__/labFixtures';
import { BENCHMARK_SENTENCES } from '../../../domain/pronunciation/lab/benchmark';

const assessMock = vi.fn();
vi.mock('../../../services/pronunciation/pronunciationClient', () => ({
  assessPronunciation: (...args: unknown[]) => assessMock(...args),
}));
const allowanceMock = vi.hoisted(() => ({ fn: vi.fn(async (): Promise<unknown> => null) }));
vi.mock('../../../services/pronunciation/labAllowance', () => ({ getLabAllowance: () => allowanceMock.fn() }));
const trackMock = vi.fn();
vi.mock('../../../services/telemetry/telemetryService', () => ({ track: (...a: unknown[]) => trackMock(...a), captureError: vi.fn() }));
vi.mock('../../../components/SpeakingConsentGate', () => ({ SpeakingConsentGate: ({ children }: { children: unknown }) => children }));
vi.mock('../../../components/GuardianConsentNotice', () => ({ GuardianConsentNotice: () => <p>Waiting for your parent/guardian's OK</p> }));

const audio = vi.hoisted(() => ({
  playClip: vi.fn(async () => true),
  stopClip: vi.fn(),
  playNative: vi.fn(async () => 'browser'),
  stopNative: vi.fn(),
}));
vi.mock('../audio/clipPlayer', () => ({ playClip: audio.playClip, stopClip: audio.stopClip }));
vi.mock('../audio/nativeVoice', () => ({ playNative: audio.playNative, stopNative: audio.stopNative }));

const rec = vi.hoisted(() => ({ recording: false, startFails: false }));
const BLOB = new Blob(['x'], { type: 'audio/wav' });
vi.mock('../../recording/useAudioBlobRecorder', () => ({
  useAudioBlobRecorder: () => ({
    isRecording: rec.recording,
    waveData: [],
    micLevel: { levelRef: { current: 0 } },
    start: vi.fn(async () => {
      if (rec.startFails) throw new Error('NotAllowedError');
      rec.recording = true;
    }),
    stop: vi.fn(async () => {
      rec.recording = false;
      return { blob: BLOB, url: 'blob:x', waveSnapshot: [] };
    }),
  }),
}));

import { MonthlyCheck } from '../MonthlyCheck';
import { AuthRequiredError } from '../../../lib/authToken';
import { ConsentRequiredError } from '../../../lib/consentRequired';
import { getLabHistory } from '../../../services/pronunciation/labStore';
import { STORAGE_KEYS, setStorageScope } from '../../../services/persistence/storage';
import { BENCHMARK_VERSION } from '../../../domain/pronunciation/lab/benchmark';
import { LAB_THRESHOLDS_VERSION } from '../../../domain/pronunciation/lab/thresholds';

/** Every word of the asked sentence at `accuracy`, except the first `lowFirst` words. */
function answerFor(targetText: string, accuracy: number, lowFirst = 0) {
  return scripted(
    targetText.split(/\s+/).map((w, i) => azureWord(w.replace(/[.,]/g, ''), i < lowFirst ? 30 : accuracy, { offsetMs: 300 + i * 400, durationMs: 300 })),
  );
}

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
}

async function sayIt() {
  await click(screen.getByRole('button', { name: 'Tap and say the sentence' }));
  await click(screen.getByRole('button', { name: 'Stop and check' }));
}

beforeEach(() => {
  localStorage.clear();
  setStorageScope('test-user');
  rec.recording = false;
  rec.startFails = false;
});

afterEach(() => {
  cleanup();
  assessMock.mockReset();
  trackMock.mockReset();
  allowanceMock.fn.mockReset();
  allowanceMock.fn.mockResolvedValue(null);
  Object.values(audio).forEach((m) => m.mockClear());
});

describe('MonthlyCheck', () => {
  it('explains itself first and says nothing is saved if you leave', () => {
    render(<MonthlyCheck onDone={vi.fn()} />);
    expect(screen.getByText('Five short sentences — the same five every month.')).toBeTruthy();
    expect(document.body.textContent).toMatch(/nothing is saved/);
    expect(screen.getByRole('button', { name: 'Start the check' })).toBeTruthy();
  });

  it('runs the five benchmark sentences, counts one take each, saves the check once and tracks a content-free count', async () => {
    assessMock.mockImplementation(async ({ targetText }: { targetText: string }) => answerFor(targetText, 95, 1));
    const onDone = vi.fn();
    render(<MonthlyCheck onDone={onDone} />);
    await click(screen.getByRole('button', { name: 'Start the check' }));

    for (let i = 0; i < BENCHMARK_SENTENCES.length; i++) {
      expect(screen.getByText(`Sentence ${i + 1} of 5`)).toBeTruthy();
      await sayIt();
      expect(assessMock).toHaveBeenLastCalledWith(expect.objectContaining({
        targetText: BENCHMARK_SENTENCES[i], source: 'pronunciation_lab', mode: 'scripted',
      }));
      expect(screen.getByText('This take counts for your check.')).toBeTruthy();
      await click(screen.getByRole('button', { name: i < 4 ? 'Next sentence' : 'See my check' }));
    }

    const summary = screen.getByTestId('monthly-check-summary');
    const totalWords = BENCHMARK_SENTENCES.reduce((n, s) => n + s.split(/\s+/).length, 0);
    expect(summary.textContent).toContain(`${totalWords - 5} of ${totalWords} words clear`);
    expect(document.body.textContent).not.toMatch(/\bscore\b/i);

    const history = getLabHistory();
    expect(history.checks).toHaveLength(1);
    expect(history.checks[0]).toMatchObject({ benchmarkVersion: BENCHMARK_VERSION, thresholdsVersion: LAB_THRESHOLDS_VERSION });
    expect(history.checks[0].sentences).toHaveLength(5);
    // Each counted take also fed the sound-family history.
    expect(history.observations.length).toBeGreaterThan(0);
    const done = trackMock.mock.calls.filter(([e]) => e.name === 'monthly_check_done');
    expect(done).toEqual([[{ name: 'monthly_check_done', props: { words_clear: totalWords - 5, words_total: totalWords, sentences_measured: 5, first_check: true } }]]);

    await click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('shows this check beside the last one, over the same sentences', async () => {
    assessMock.mockImplementation(async ({ targetText }: { targetText: string }) => answerFor(targetText, 95, 3));
    const first = render(<MonthlyCheck onDone={vi.fn()} />);
    await click(screen.getByRole('button', { name: 'Start the check' }));
    for (let i = 0; i < 5; i++) {
      await sayIt();
      await click(screen.getByRole('button', { name: i < 4 ? 'Next sentence' : 'See my check' }));
    }
    first.unmount();

    assessMock.mockImplementation(async ({ targetText }: { targetText: string }) => answerFor(targetText, 95, 0));
    render(<MonthlyCheck onDone={vi.fn()} />);
    expect(document.body.textContent).toMatch(/Last check \(/);
    await click(screen.getByRole('button', { name: 'Start the check' }));
    for (let i = 0; i < 5; i++) {
      await sayIt();
      await click(screen.getByRole('button', { name: i < 4 ? 'Next sentence' : 'See my check' }));
    }
    const text = screen.getByTestId('monthly-check-summary').textContent ?? '';
    // "<date>: <before>. <date>: <after>." over the same five sentences.
    expect(text).toMatch(/: 32 of 47 words clear\. .*: 47 of 47 words clear\./);
    expect(getLabHistory().checks).toHaveLength(2);
  });

  it('a failed check is a notice and can be tried again; three failures leave the sentence out, never as zero', async () => {
    assessMock.mockRejectedValue(new Error('network'));
    render(<MonthlyCheck onDone={vi.fn()} />);
    await click(screen.getByRole('button', { name: 'Start the check' }));
    await sayIt();
    expect(screen.getByRole('status').textContent).toMatch(/couldn't check that take/);
    await sayIt();
    await sayIt();
    expect(screen.getByText('Sentence 2 of 5')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/left out of this month's check/);
  });

  it('skipping every sentence saves nothing and tracks nothing', async () => {
    render(<MonthlyCheck onDone={vi.fn()} />);
    await click(screen.getByRole('button', { name: 'Start the check' }));
    for (let i = 0; i < 5; i++) await click(screen.getByRole('button', { name: 'Skip this sentence' }));
    expect(screen.getByText('Nothing could be checked this time.')).toBeTruthy();
    expect(getLabHistory().checks).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEYS.labHistory}::test-user`)).toBeNull();
    expect(trackMock.mock.calls.some(([e]) => e.name === 'monthly_check_done')).toBe(false);
  });

  it('a missing microphone is a notice, not a dead end', async () => {
    rec.startFails = true;
    render(<MonthlyCheck onDone={vi.fn()} />);
    await click(screen.getByRole('button', { name: 'Start the check' }));
    await click(screen.getByRole('button', { name: 'Tap and say the sentence' }));
    expect(screen.getByRole('status').textContent).toMatch(/microphone isn't available/);
    expect(screen.getByRole('button', { name: 'Skip this sentence' })).toBeTruthy();
  });

  it('sign-in and consent end the check with the reason and Continue', async () => {
    assessMock.mockRejectedValueOnce(new AuthRequiredError());
    const onDone = vi.fn();
    render(<MonthlyCheck onDone={onDone} />);
    await click(screen.getByRole('button', { name: 'Start the check' }));
    await sayIt();
    expect(document.body.textContent).toMatch(/Sign in to check how your words sound/);
    await click(screen.getByRole('button', { name: 'Continue' }));
    expect(onDone).toHaveBeenCalled();
    cleanup();

    assessMock.mockRejectedValueOnce(new ConsentRequiredError());
    render(<MonthlyCheck onDone={vi.fn()} />);
    await click(screen.getByRole('button', { name: 'Start the check' }));
    await sayIt();
    expect(document.body.textContent).toMatch(/parent\/guardian/);
  });

  describe('daily allowance (Stage 7)', () => {
    const allowance = (remaining: number) => ({ limit: 30, used: 30 - remaining, remaining, resetsAt: '2026-10-30T00:00:00+00:00' });

    it('shows the count on the intro, and warns when it will not cover the five sentences', async () => {
      allowanceMock.fn.mockResolvedValue(allowance(3));
      render(<MonthlyCheck onDone={vi.fn()} />);
      expect((await screen.findByTestId('lab-allowance')).textContent).toMatch(/3 checks left today.*may not reach every sentence/);
      expect((screen.getByRole('button', { name: 'Start the check' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('will not start a check that cannot be saved (fewer than 3 checks left), and says when to come back', async () => {
      allowanceMock.fn.mockResolvedValue(allowance(2));
      const onDone = vi.fn();
      render(<MonthlyCheck onDone={onDone} />);
      expect((await screen.findByTestId('lab-allowance')).textContent).toMatch(/needs at least 3.*tomorrow/);
      expect((screen.getByRole('button', { name: 'Start the check' }) as HTMLButtonElement).disabled).toBe(true);
      await click(screen.getByRole('button', { name: 'Not now' }));
      expect(onDone).toHaveBeenCalled();
    });

    it('a refusal part-way ends the check at the summary and keeps the sentences already measured (when enough)', async () => {
      const { LabAllowanceError } = await import('../../../lib/labAllowance');
      allowanceMock.fn.mockResolvedValue(allowance(30));
      assessMock.mockImplementation(async ({ targetText }: { targetText: string }) => answerFor(targetText, 95));
      render(<MonthlyCheck onDone={vi.fn()} />);
      await click(screen.getByRole('button', { name: 'Start the check' }));
      for (let i = 0; i < 3; i++) {
        await sayIt();
        await click(screen.getByRole('button', { name: 'Next sentence' }));
      }
      assessMock.mockRejectedValueOnce(new LabAllowanceError(30));
      await sayIt();
      expect(screen.getByTestId('monthly-check-summary')).toBeTruthy();
      expect(document.body.textContent).toMatch(/used today's checks/);
      expect(getLabHistory().checks).toHaveLength(1);
      expect(getLabHistory().checks[0].sentences).toHaveLength(3);
      expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
    });

    it('with none left mid-check the sentence cannot be recorded, only listened to or skipped', async () => {
      allowanceMock.fn.mockResolvedValueOnce(allowance(5)).mockResolvedValue(allowance(0));
      assessMock.mockImplementation(async ({ targetText }: { targetText: string }) => answerFor(targetText, 95));
      render(<MonthlyCheck onDone={vi.fn()} />);
      await click(screen.getByRole('button', { name: 'Start the check' }));
      await sayIt();
      await click(screen.getByRole('button', { name: 'Next sentence' }));
      expect((screen.getByRole('button', { name: 'No checks left today' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByRole('button', { name: 'Skip this sentence' })).toBeTruthy();
    });
  });

  it('Listen asks for the recorded sentence without on-demand synthesis', async () => {
    render(<MonthlyCheck onDone={vi.fn()} />);
    await click(screen.getByRole('button', { name: 'Start the check' }));
    await click(screen.getByRole('button', { name: /Slowly/ }));
    expect(audio.playNative).toHaveBeenCalledWith(BENCHMARK_SENTENCES[0], { speed: 0.75 });
  });
});
