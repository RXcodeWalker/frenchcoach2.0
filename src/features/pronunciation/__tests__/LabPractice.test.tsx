// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { azureWord, scripted } from '../../../domain/pronunciation/lab/__tests__/labFixtures';

const assessMock = vi.fn();
vi.mock('../../../services/pronunciation/pronunciationClient', () => ({
  assessPronunciation: (...args: unknown[]) => assessMock(...args),
}));
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

const rec = vi.hoisted(() => ({ recording: false, startFails: false, stopReturnsNull: false }));
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
      return rec.stopReturnsNull ? null : { blob: BLOB, url: 'blob:x', waveSnapshot: [] };
    }),
  }),
}));

import { LabPractice } from '../LabPractice';
import { ConsentRequiredError } from '../../../lib/consentRequired';
import { AuthRequiredError } from '../../../lib/authToken';
import { AudioTooShortError } from '../../../domain/pronunciation/audioNormalizer';

const SENTENCE = 'Les enfants jouent dans le jardin.';
const WORDS = ['Les', 'enfants', 'jouent', 'dans', 'le', 'jardin'];

function sentenceResult(scores: number[], overrides = {}) {
  return scripted(
    WORDS.map((w, i) => azureWord(w, scores[i], { offsetMs: 300 + i * 400, durationMs: 300 })),
    { score: 73, ...overrides },
  );
}

beforeEach(() => {
  rec.recording = false;
  rec.startFails = false;
  rec.stopReturnsNull = false;
});

afterEach(() => {
  cleanup();
  assessMock.mockReset();
  trackMock.mockReset();
  Object.values(audio).forEach((m) => m.mockClear());
});

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
}

/** Record and stop one take (the stop button appears once recording). */
async function recordTake(startName: RegExp) {
  await click(screen.getByRole('button', { name: startName }));
  await click(screen.getByRole('button', { name: 'Stop and check' }));
}

function renderLab(onDone = vi.fn()) {
  render(<LabPractice targetSentence={SENTENCE} entry="learn_feedback" onDone={onDone} />);
  return onDone;
}

describe('LabPractice', () => {
  it('Listen: the sentence, Listen / Slowly, and a record button; lab_opened is tracked', () => {
    renderLab();
    expect(trackMock).toHaveBeenCalledWith({ name: 'lab_opened', props: { entry: 'learn_feedback' } });
    expect(screen.getByRole('button', { name: /Listen/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Slowly/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tap and say the sentence' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hear « enfants »' })).toBeTruthy();
  });

  it('Listen plays the sentence through the native voice, slow at 0.75', async () => {
    renderLab();
    await click(screen.getByRole('button', { name: /Slowly/ }));
    expect(audio.playNative).toHaveBeenCalledWith(SENTENCE, { speed: 0.75 });
  });

  it('a take is checked in scripted mode as the Lab, and shows "N of M words clear" with a legend — never a 0–100 number', async () => {
    assessMock.mockResolvedValue(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);

    expect(assessMock).toHaveBeenCalledWith(expect.objectContaining({
      audioBlob: BLOB, targetText: SENTENCE, source: 'pronunciation_lab', mode: 'scripted',
    }));
    expect(screen.getByText('4 of 6 words clear')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'What the marks mean' }).textContent).toMatch(/Clear.*Almost.*Practise this.*Not heard/);
    expect(screen.getByRole('button', { name: '« enfants »: Practise this. Hear you, then native' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '« jardin. »: Almost. Hear you, then native' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\b73\b/);
    expect(trackMock).toHaveBeenCalledWith({ name: 'lab_take', props: { words_clear: 4, words_total: 6, take_index: 1 } });
    expect(screen.getByText('Two words worth practising: « enfants » and « jardin ».')).toBeTruthy();
  });

  it('tapping a word plays you (that word\'s clip), then native (the liaison group first)', async () => {
    assessMock.mockResolvedValue(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: /« enfants »: Practise this/ }));

    expect(audio.playClip).toHaveBeenCalledWith(BLOB, expect.objectContaining({ startS: expect.any(Number), endS: expect.any(Number) }));
    const clip = (audio.playClip.mock.calls[0] as unknown as [Blob, { startS: number; endS: number }])[1];
    expect(clip.startS).toBeCloseTo(0.7 - 0.12, 5);
    expect(audio.playNative).toHaveBeenLastCalledWith(['les enfants', 'enfants'], { speed: 1 });
  });

  it('Play both: your whole take, then the native sentence', async () => {
    assessMock.mockResolvedValue(sentenceResult([95, 95, 95, 95, 95, 95]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: /Play both/ }));
    expect(audio.playClip).toHaveBeenCalledWith(BLOB);
    expect(audio.playNative).toHaveBeenLastCalledWith(SENTENCE, { speed: 1 });
  });

  it('focus drill: tip, hear it slowly, record the word alone, a verdict that never says wrong; then the sentence again, first vs best', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: 'Practise these words' }));

    expect(screen.getByText('Word 1 of 2', { exact: false })).toBeTruthy();
    await click(screen.getByRole('button', { name: /Hear it slowly/ }));
    expect(audio.playNative).toHaveBeenLastCalledWith('enfants', { speed: 0.75 });

    assessMock.mockResolvedValueOnce(scripted([azureWord('enfants', 45)]));
    await recordTake(/Tap and say the word/);
    expect(assessMock).toHaveBeenLastCalledWith(expect.objectContaining({ targetText: 'enfants', mode: 'scripted', source: 'pronunciation_lab' }));
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/wrong/i);
    expect(trackMock).toHaveBeenCalledWith({ name: 'lab_focus_word_used', props: { verdict: 'tryAgain' } });

    assessMock.mockResolvedValueOnce(scripted([azureWord('enfants', 92)]));
    await recordTake(/Tap and say the word/);
    expect(screen.getByText('That one was clear.')).toBeTruthy();
    expect(trackMock.mock.calls.filter(([e]) => (e as { name: string }).name === 'lab_focus_word_used')).toHaveLength(1);

    await click(screen.getByRole('button', { name: 'Next word' }));
    expect(screen.getByText('jardin')).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Skip' }));
    await click(screen.getByRole('button', { name: /Say the whole sentence again/ }));

    assessMock.mockResolvedValueOnce(sentenceResult([95, 95, 95, 95, 95, 95]));
    await recordTake(/Tap and say the sentence/);
    expect(screen.getByText('6 of 6 words clear')).toBeTruthy();
    expect(screen.getByText('First take 4 → best 6 of 6 words clear')).toBeTruthy();
    expect(trackMock).toHaveBeenCalledWith({ name: 'lab_take', props: { words_clear: 6, words_total: 6, take_index: 2 } });
  });

  it('a result that cannot give word states (not Azure) says so and still lets the learner listen back', async () => {
    assessMock.mockResolvedValue(sentenceResult([95, 95, 95, 95, 95, 95], { provider: 'whisper-heuristic' }));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    expect(screen.queryByText(/words clear/)).toBeNull();
    expect(screen.getByText(/couldn't check the words this time/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Play both/ })).toBeTruthy();
    expect(trackMock.mock.calls.some(([e]) => (e as { name: string }).name === 'lab_take')).toBe(false);
  });

  describe('never a trap', () => {
    it('Done always leaves, and stops any audio', async () => {
      const onDone = renderLab();
      await click(screen.getByRole('button', { name: 'Done' }));
      expect(onDone).toHaveBeenCalledOnce();
      expect(audio.stopClip).toHaveBeenCalled();
      expect(audio.stopNative).toHaveBeenCalled();
    });

    it('no microphone: a notice, and Done still works', async () => {
      rec.startFails = true;
      const onDone = renderLab();
      await click(screen.getByRole('button', { name: 'Tap and say the sentence' }));
      expect(screen.getByText(/microphone isn't available/)).toBeTruthy();
      await click(screen.getByRole('button', { name: 'Done' }));
      expect(onDone).toHaveBeenCalledOnce();
    });

    it('a failed check: a notice, and the learner can record again', async () => {
      assessMock.mockRejectedValueOnce(new Error('timeout'));
      renderLab();
      await recordTake(/Tap and say the sentence/);
      expect(screen.getByText(/couldn't check that take/)).toBeTruthy();
      assessMock.mockResolvedValueOnce(sentenceResult([95, 95, 95, 95, 95, 95]));
      await recordTake(/Tap and say the sentence/);
      expect(screen.getByText('6 of 6 words clear')).toBeTruthy();
    });

    it('too short to check', async () => {
      assessMock.mockRejectedValueOnce(new AudioTooShortError(0.2));
      renderLab();
      await recordTake(/Tap and say the sentence/);
      expect(screen.getByText(/too short to check/)).toBeTruthy();
    });

    it('consent required: the guardian message, then Continue moves on', async () => {
      assessMock.mockRejectedValueOnce(new ConsentRequiredError());
      const onDone = renderLab();
      await recordTake(/Tap and say the sentence/);
      expect(screen.getByText("Waiting for your parent/guardian's OK")).toBeTruthy();
      expect(onDone).not.toHaveBeenCalled();
      await click(screen.getByRole('button', { name: 'Continue' }));
      expect(onDone).toHaveBeenCalledOnce();
    });

    it('signed out: asks to sign in, then Continue moves on', async () => {
      assessMock.mockRejectedValueOnce(new AuthRequiredError('Sign in'));
      const onDone = renderLab();
      await recordTake(/Tap and say the sentence/);
      expect(screen.getByText(/Sign in to check how your words sound/)).toBeTruthy();
      await click(screen.getByRole('button', { name: 'Continue' }));
      expect(onDone).toHaveBeenCalledOnce();
    });
  });

  it('stops audio on unmount', () => {
    const { unmount } = render(<LabPractice targetSentence={SENTENCE} entry="learn_feedback" onDone={vi.fn()} />);
    audio.stopClip.mockClear();
    audio.stopNative.mockClear();
    unmount();
    expect(audio.stopClip).toHaveBeenCalled();
    expect(audio.stopNative).toHaveBeenCalled();
  });
});
