// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { azureWord, scripted } from '../../../domain/pronunciation/lab/__tests__/labFixtures';

const assessMock = vi.fn();
const allowanceMock = vi.hoisted(() => ({ fn: vi.fn(async (): Promise<unknown> => null) }));
vi.mock('../../../services/pronunciation/labAllowance', () => ({ getLabAllowance: () => allowanceMock.fn() }));
vi.mock('../../../services/pronunciation/pronunciationClient', () => ({ assessPronunciation: (...a: unknown[]) => assessMock(...a) }));
vi.mock('../../../components/SpeakingConsentGate', () => ({ SpeakingConsentGate: ({ children }: { children: unknown }) => children }));
vi.mock('../../../components/GuardianConsentNotice', () => ({ GuardianConsentNotice: () => <p>Waiting for your parent/guardian's OK</p> }));
const audio = vi.hoisted(() => ({
  playClip: vi.fn(async () => true),
  stopClip: vi.fn(),
  playNative: vi.fn<(text: unknown, opts?: unknown) => Promise<string>>(async () => 'recorded'),
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

import { ConsentRequiredError } from '../../../lib/consentRequired';
import { AuthRequiredError } from '../../../lib/authToken';
import { AudioTooShortError } from '../../../domain/pronunciation/audioNormalizer';
import { emptyLabHistory } from '../../../domain/pronunciation/lab/labHistory';
import { localDay } from '../../../domain/pronunciation/lab/trickyWords';
import { MAX_WORD_TAKES } from '../labPracticeState';
import { loadLabHistory, resetLabStoreForTests } from '../labStore';
import { WordDrill } from '../WordDrill';

const KEY = 'frenchCoach_pronunciationLab';

function seedTricky(word: string, overrides: Partial<{ clearRun: number; lastClearDay: string | null; lastDay: string }> = {}) {
  const h = { ...emptyLabHistory(), words: { [word]: { status: 'tricky' as const, practiseCount: 2, clearRun: 0, lastDay: '2000-01-01', lastClearDay: null, ...overrides } } };
  localStorage.setItem(KEY, JSON.stringify(h));
  resetLabStoreForTests();
}

beforeEach(() => {
  localStorage.clear();
  resetLabStoreForTests();
  rec.recording = false;
  rec.startFails = false;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(() => {
  cleanup();
  assessMock.mockReset();
  allowanceMock.fn.mockReset();
  allowanceMock.fn.mockResolvedValue(null);
  Object.values(audio).forEach((m) => m.mockClear());
});

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
}
async function tryOnce() {
  await click(screen.getByRole('button', { name: 'Tap and say the word' }));
  await click(screen.getByRole('button', { name: 'Stop and check' }));
}
const result = (score: number) => scripted([azureWord('tout', score, { phonemeScores: [score, score, score] })]);

describe('WordDrill', () => {
  it('shows the word, a tip and plays it (also slowly) through the native voice', async () => {
    render(<WordDrill word="tout" onClose={vi.fn()} />);
    expect(screen.getByText('tout')).toBeTruthy();
    expect(screen.getByText(/ou — round your lips/)).toBeTruthy();
    await click(screen.getByRole('button', { name: /Hear it slowly/ }));
    expect(audio.playNative).toHaveBeenCalledWith('tout', expect.objectContaining({ speed: 0.75 }));
  });

  it('checks the word alone as a scripted Lab check and records a Clear day', async () => {
    seedTricky('tout');
    assessMock.mockResolvedValue(result(95));
    render(<WordDrill word="tout" onClose={vi.fn()} />);
    await tryOnce();
    expect(assessMock).toHaveBeenCalledWith(expect.objectContaining({ targetText: 'tout', source: 'pronunciation_lab', mode: 'scripted' }));
    expect(screen.getByText('Clear')).toBeTruthy();
    expect(screen.getByText(/Clear today. Say it clearly on another day/)).toBeTruthy();
    expect(loadLabHistory().words.tout.clearRun).toBe(1);
    expect(loadLabHistory().words.tout.lastClearDay).toBe(localDay(new Date()));
  });

  it('a second Clear on another day takes the word off the list and says so', async () => {
    seedTricky('tout', { clearRun: 1, lastClearDay: '2000-01-02' });
    assessMock.mockResolvedValue(result(95));
    render(<WordDrill word="tout" onClose={vi.fn()} />);
    await tryOnce();
    expect(screen.getByText(/this word has left your list/)).toBeTruthy();
    expect(loadLabHistory().words.tout.status).toBe('cleared');
  });

  it('"Try again" is the only negative, never "wrong"; it is not a Clear day', async () => {
    seedTricky('tout');
    assessMock.mockResolvedValue(result(30));
    render(<WordDrill word="tout" onClose={vi.fn()} />);
    await tryOnce();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\bwrong\b/i);
    expect(loadLabHistory().words.tout.clearRun).toBe(0);
    expect(loadLabHistory().words.tout.practiseCount).toBe(3);
  });

  it('allows only MAX_WORD_TAKES tries a sitting', async () => {
    seedTricky('tout');
    assessMock.mockResolvedValue(result(95));
    render(<WordDrill word="tout" onClose={vi.fn()} />);
    for (let i = 0; i < MAX_WORD_TAKES; i++) await tryOnce();
    expect(screen.getByRole('button', { name: 'That’s all the tries for this word' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/enough tries for this word/)).toBeTruthy();
    expect(assessMock).toHaveBeenCalledTimes(MAX_WORD_TAKES);
  });

  it('a result that cannot give word states is a notice, nothing is recorded, and the card still works', async () => {
    seedTricky('tout');
    assessMock.mockResolvedValue(scripted([azureWord('tout', 90)], { couldNotAssess: true }));
    const onClose = vi.fn();
    render(<WordDrill word="tout" onClose={onClose} />);
    await tryOnce();
    expect(screen.getByText(/couldn't check the words this time/)).toBeTruthy();
    expect(loadLabHistory().words.tout.clearRun).toBe(0);
    await click(screen.getByRole('button', { name: 'Not now' }));
    expect(onClose).toHaveBeenCalled();
  });

  it.each([
    ['too short', new AudioTooShortError(0.2), /too short/],
    ['a failed check', new Error('boom'), /couldn't check that take/],
  ])('%s is a notice, not a dead end', async (_label, error, pattern) => {
    assessMock.mockRejectedValue(error);
    render(<WordDrill word="tout" onClose={vi.fn()} />);
    await tryOnce();
    expect(screen.getByText(pattern)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tap and say the word' })).toBeTruthy();
  });

  describe('the daily Lab allowance (Stage 7)', () => {
    const allowance = (remaining: number) => ({ limit: 30, used: 30 - remaining, remaining, resetsAt: '2026-10-30T00:00:00+00:00' });

    it('shows how many checks are left', async () => {
      allowanceMock.fn.mockResolvedValue(allowance(12));
      render(<WordDrill word="tout" onClose={vi.fn()} />);
      expect((await screen.findByTestId('lab-allowance')).textContent).toMatch(/12/);
    });

    it('the server refusing a try says the checks are used up — not "couldn\'t check" — and stops recording, but listening still works', async () => {
      const { LabAllowanceError } = await import('../../../lib/labAllowance');
      allowanceMock.fn.mockResolvedValue(allowance(5));
      assessMock.mockRejectedValueOnce(new LabAllowanceError(30));
      render(<WordDrill word="tout" onClose={vi.fn()} />);
      await tryOnce();
      expect(screen.getByText(/used today's checks/)).toBeTruthy();
      expect(screen.queryByText(/couldn't check that take/)).toBeNull();
      expect((screen.getByRole('button', { name: 'No checks left today' }) as HTMLButtonElement).disabled).toBe(true);
      await click(screen.getByRole('button', { name: /Hear it slowly/ }));
      expect(audio.playNative).toHaveBeenCalled();
    });

    it('with none left to start with, the record control waits for tomorrow', async () => {
      allowanceMock.fn.mockResolvedValue(allowance(0));
      render(<WordDrill word="tout" onClose={vi.fn()} />);
      const button = (await screen.findByRole('button', { name: 'No checks left today' })) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });
  });

  it('microphone unavailable is a notice', async () => {
    rec.startFails = true;
    render(<WordDrill word="tout" onClose={vi.fn()} />);
    await click(screen.getByRole('button', { name: 'Tap and say the word' }));
    expect(screen.getByText(/microphone isn't available/)).toBeTruthy();
  });

  it('consent and sign-in end the card with a reason and Continue', async () => {
    assessMock.mockRejectedValueOnce(new ConsentRequiredError());
    const onClose = vi.fn();
    render(<WordDrill word="tout" onClose={onClose} />);
    await tryOnce();
    expect(screen.getByText(/Waiting for your parent/)).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Continue' }));
    expect(onClose).toHaveBeenCalled();
    cleanup();

    assessMock.mockRejectedValueOnce(new AuthRequiredError());
    render(<WordDrill word="tout" onClose={onClose} />);
    await tryOnce();
    expect(screen.getByText(/Sign in to check how your words sound/)).toBeTruthy();
  });
});
