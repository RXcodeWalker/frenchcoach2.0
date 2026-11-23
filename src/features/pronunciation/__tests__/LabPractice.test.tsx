// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { azureWord, scripted } from '../../../domain/pronunciation/lab/__tests__/labFixtures';

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

const rec = vi.hoisted(() => ({ recording: false, startFails: false, stopReturnsNull: false, wav: null as Blob | null }));
const BLOB = new Blob(['x'], { type: 'audio/wav' });
vi.mock('../../recording/useAudioBlobRecorder', () => ({
  checkableAudio: (r: { blob: Blob; wav?: Blob | null }) => r.wav ?? r.blob,
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
      return rec.stopReturnsNull ? null : { blob: BLOB, url: 'blob:x', waveSnapshot: [], wav: rec.wav };
    }),
  }),
}));

import { LabPractice } from '../LabPractice';
import { loadLabHistory, resetLabStoreForTests } from '../labStore';
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
  localStorage.clear();
  resetLabStoreForTests();
  rec.recording = false;
  rec.startFails = false;
  rec.stopReturnsNull = false;
  rec.wav = null;
});

afterEach(() => {
  cleanup();
  assessMock.mockReset();
  trackMock.mockReset();
  allowanceMock.fn.mockReset();
  allowanceMock.fn.mockResolvedValue(null);
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
  it('records each usable whole-sentence take in the Lab history exactly once, and never a refused one', async () => {
    renderLab();
    assessMock.mockResolvedValueOnce(scripted(WORDS.map((w) => azureWord(w, 90)), { couldNotAssess: true }));
    await recordTake(/Tap and say the sentence/);
    expect(loadLabHistory().observations).toEqual([]);
    assessMock.mockResolvedValueOnce(sentenceResult([95, 40, 95, 95, 95, 70]));
    await click(screen.getByRole('button', { name: /Say the whole sentence again/ }));
    await recordTake(/Tap and say the sentence/);
    const days = loadLabHistory().observations.map((o) => `${o.family}`);
    expect(days.length).toBeGreaterThan(0);
    // One take, not two: no family is recorded twice from a single take.
    expect(new Set(days).size).toBe(days.length);
  });

  it('Listen: the sentence, Listen, a speed slider, and a record button; lab_opened is tracked', () => {
    renderLab();
    expect(trackMock).toHaveBeenCalledWith({ name: 'lab_opened', props: { entry: 'learn_feedback' } });
    expect(screen.getByRole('button', { name: /Listen/ })).toBeTruthy();
    expect(screen.getByLabelText('Speed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tap and say the sentence' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hear « enfants »' })).toBeTruthy();
  });

  it('Listen plays the sentence through the native voice at the slider speed', async () => {
    renderLab();
    await click(screen.getByRole('button', { name: /Listen/ }));
    expect(audio.playNative).toHaveBeenLastCalledWith(SENTENCE, expect.objectContaining({ speed: 1, synthesize: true }));
    fireEvent.change(screen.getByLabelText('Speed'), { target: { value: '0.75' } });
    await click(screen.getByRole('button', { name: /Listen/ }));
    expect(audio.playNative).toHaveBeenLastCalledWith(SENTENCE, expect.objectContaining({ speed: 0.75, synthesize: true }));
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
    expect(audio.playNative).toHaveBeenLastCalledWith(['les enfants', 'enfants'], expect.objectContaining({ speed: 1, synthesize: false }));
  });

  it('tapping a word offers practising just that word — the sentence take is kept, never re-recorded', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    expect(screen.queryByTestId('lab-word-actions')).toBeNull();
    await click(screen.getByRole('button', { name: /« jouent »: Clear/ }));
    await click(screen.getByRole('button', { name: /Practise just this word/ }));

    expect(screen.getByText('jouent')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tap and say the sentence' })).toBeNull();
    assessMock.mockResolvedValueOnce(scripted([azureWord('jouent', 92)]));
    await recordTake(/Tap and say the word/);
    expect(assessMock).toHaveBeenLastCalledWith(expect.objectContaining({ targetText: 'jouent', mode: 'scripted' }));
    expect(assessMock).toHaveBeenCalledTimes(2);

    await click(screen.getByRole('button', { name: 'Back to your sentence' }));
    expect(screen.getByText('4 of 6 words clear')).toBeTruthy();
  });

  it('checks and plays back the WAV built from the live samples, never the webm that may not decode', async () => {
    const wav = new Blob(['wav'], { type: 'audio/wav' });
    rec.wav = wav;
    assessMock.mockResolvedValue(sentenceResult([95, 95, 95, 95, 95, 95]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    expect(assessMock).toHaveBeenLastCalledWith(expect.objectContaining({ audioBlob: wav }));
    await click(screen.getByRole('button', { name: /Play both/ }));
    expect(audio.playClip).toHaveBeenCalledWith(wav);
  });

  it('a word cleared in its drill shows as "Fixed in practice" back on the sentence; the take count is unchanged', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 70, 95, 95, 95, 95]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    expect(screen.getByRole('button', { name: /« enfants »: Almost/ })).toBeTruthy();
    await click(screen.getByRole('button', { name: /« enfants »: Almost/ }));
    await click(screen.getByRole('button', { name: /Practise just this word/ }));
    assessMock.mockResolvedValueOnce(scripted([azureWord('enfants', 95)]));
    await recordTake(/Tap and say the word/);
    await click(screen.getByRole('button', { name: 'Back to your sentence' }));

    expect(screen.getByRole('button', { name: /« enfants »: Fixed in practice/ })).toBeTruthy();
    expect(screen.getByText('5 of 6 words clear')).toBeTruthy();
    expect(screen.getByText(/1 more word fixed in practice — say the whole sentence again to lock it in\./)).toBeTruthy();
    expect(screen.getByRole('list', { name: 'What the marks mean' }).textContent).toContain('Fixed in practice');
  });

  it('after Try again, says which sound in the word scored lowest; nothing once it is clear', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 95, 95, 95, 95, 40]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: /« jardin.? »: Practise this/ }));
    await click(screen.getByRole('button', { name: /Practise just this word/ }));
    assessMock.mockResolvedValueOnce(scripted([azureWord('jardin', 45, { phonemeScores: [90, 90, 30, 90, 90] })]));
    await recordTake(/Tap and say the word/);
    expect(screen.getByTestId('lab-weak-sound').textContent).toContain('Listen closely to the « r » in « jardin »');
    assessMock.mockResolvedValueOnce(scripted([azureWord('jardin', 92, { phonemeScores: [90, 90, 90, 90, 90] })]));
    await recordTake(/Tap and say the word/);
    expect(screen.queryByTestId('lab-weak-sound')).toBeNull();
  });

  it('a word whose latest drill was not clear keeps its take state', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 70, 95, 95, 95, 95]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: /« enfants »: Almost/ }));
    await click(screen.getByRole('button', { name: /Practise just this word/ }));
    assessMock.mockResolvedValueOnce(scripted([azureWord('enfants', 40)]));
    await recordTake(/Tap and say the word/);
    await click(screen.getByRole('button', { name: 'Back to your sentence' }));
    expect(screen.getByRole('button', { name: /« enfants »: Almost/ })).toBeTruthy();
    expect(screen.queryByText(/fixed in practice/)).toBeNull();
  });

  it('every focus word offers a way back to the sentence, even before the last one', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: 'Practise these words' }));
    expect(screen.getByText('Word 1 of 2', { exact: false })).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Back to your sentence' }));
    expect(screen.getByText('4 of 6 words clear')).toBeTruthy();
  });

  it('Play both: your whole take, then the native sentence', async () => {
    assessMock.mockResolvedValue(sentenceResult([95, 95, 95, 95, 95, 95]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: /Play both/ }));
    expect(audio.playClip).toHaveBeenCalledWith(BLOB);
    expect(audio.playNative).toHaveBeenLastCalledWith(SENTENCE, expect.objectContaining({ speed: 1, synthesize: true }));
  });

  it('focus drill: tip, hear it, record the word alone, a verdict that never says wrong; then the sentence again, first vs best', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: 'Practise these words' }));

    expect(screen.getByText('Word 1 of 2', { exact: false })).toBeTruthy();
    await click(screen.getByRole('button', { name: /Hear it/ }));
    expect(audio.playNative).toHaveBeenLastCalledWith('enfants', expect.objectContaining({ speed: 1, synthesize: false }));

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

  describe('daily allowance (Stage 7)', () => {
    const allowance = (remaining: number) => ({ limit: 30, used: 30 - remaining, remaining, resetsAt: '2026-10-30T00:00:00+00:00' });

    it('says how many checks are left, and nothing when the allowance cannot be read', async () => {
      allowanceMock.fn.mockResolvedValue(allowance(12));
      renderLab();
      expect((await screen.findByTestId('lab-allowance')).textContent).toMatch(/12 checks left today/);
      cleanup();
      allowanceMock.fn.mockResolvedValue(null);
      renderLab();
      await act(async () => {});
      expect(screen.queryByTestId('lab-allowance')).toBeNull();
    });

    it('with none left, recording waits for tomorrow but listening and Done still work', async () => {
      allowanceMock.fn.mockResolvedValue(allowance(0));
      const onDone = renderLab();
      const record = await screen.findByRole('button', { name: 'No checks left today' });
      expect((record as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByTestId('lab-allowance').textContent).toMatch(/they come back tomorrow/);
      await click(screen.getByRole('button', { name: /Listen/ }));
      expect(audio.playNative).toHaveBeenCalled();
      await click(screen.getByRole('button', { name: 'Done' }));
      expect(onDone).toHaveBeenCalledOnce();
    });

    it("a take the server refuses for the allowance is a notice, not a retry: no more recording, nothing stops the flow", async () => {
      allowanceMock.fn.mockResolvedValue(allowance(1));
      const { LabAllowanceError } = await import('../../../lib/labAllowance');
      assessMock.mockRejectedValueOnce(new LabAllowanceError(30));
      const onDone = renderLab();
      await screen.findByText(/1 check left today/);
      await recordTake(/Tap and say the sentence/);
      expect(screen.getByText(/used today's checks/)).toBeTruthy();
      expect(assessMock).toHaveBeenCalledTimes(1);
      expect((screen.getByRole('button', { name: 'No checks left today' }) as HTMLButtonElement).disabled).toBe(true);
      await click(screen.getByRole('button', { name: 'Done' }));
      expect(onDone).toHaveBeenCalledOnce();
    });

    it('re-reads the allowance after a checked take', async () => {
      allowanceMock.fn.mockResolvedValueOnce(allowance(5)).mockResolvedValue(allowance(4));
      assessMock.mockResolvedValueOnce(sentenceResult([95, 95, 95, 95, 95, 95]));
      renderLab();
      await screen.findByText(/5 checks left today/);
      await recordTake(/Tap and say the sentence/);
      expect(await screen.findByText(/4 checks left today/)).toBeTruthy();
    });
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

describe('LabPractice → Lab history (Stage 5)', () => {
  it('a usable sentence take adds sound observations and "Practise this" words to the local history — never the sentence', async () => {
    assessMock.mockResolvedValue(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    const history = loadLabHistory();
    expect(history.words.enfants?.status).toBe('watching');
    expect(history.words.les).toBeUndefined();
    expect(localStorage.getItem('frenchCoach_pronunciationLab') ?? '').not.toMatch(/jardin|jouent/);
  });

  it('a refused take (not word-checkable) adds nothing', async () => {
    assessMock.mockResolvedValue(sentenceResult([95, 40, 95, 95, 95, 70], { couldNotAssess: true }));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    expect(localStorage.getItem('frenchCoach_pronunciationLab')).toBeNull();
  });

  it('a failed focus-word drill counts as a miss for that word', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 30, 95, 95, 95, 95]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: 'Practise it' }));
    assessMock.mockResolvedValueOnce(scripted([azureWord('enfants', 30)]));
    await recordTake(/Tap and say the word/);
    expect(loadLabHistory().words.enfants.practiseCount).toBe(2);
    expect(loadLabHistory().words.enfants.status).toBe('tricky');
  });
});

describe('LabPractice — slower listening, sound cues and longer answers', () => {
  it('offers the slow-down control on Compare and on a focus word, not only on Listen', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    // Compare
    const compareSpeed = screen.getByLabelText('Speed');
    fireEvent.change(compareSpeed, { target: { value: '0.75' } });
    await click(screen.getByRole('button', { name: /« enfants »: Practise this/ }));
    expect(audio.playNative).toHaveBeenLastCalledWith(['les enfants', 'enfants'], expect.objectContaining({ speed: 0.75 }));
    // Focus
    await click(screen.getByRole('button', { name: /Practise just this word/ }));
    expect(screen.getByLabelText('Speed')).toBeTruthy();
    await click(screen.getByRole('button', { name: /Hear it/ }));
    expect(audio.playNative).toHaveBeenLastCalledWith('enfants', expect.objectContaining({ speed: 0.75 }));
  });

  it('shows what a focus word sounds roughly like, in English letters', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 40, 95, 95, 95, 70]));
    renderLab();
    await recordTake(/Tap and say the sentence/);
    await click(screen.getByRole('button', { name: /« enfants »: Practise this/ }));
    await click(screen.getByRole('button', { name: /Practise just this word/ }));
    expect(screen.getByTestId('lab-respell').textContent).toBe('Sounds roughly like ah(n)-fah(n)');
  });

  it('says which sentence of a longer answer this is, and moves on with the first checked take kept', async () => {
    assessMock.mockResolvedValueOnce(sentenceResult([95, 40, 95, 95, 95, 70]));
    const onNextSentence = vi.fn();
    const onResult = vi.fn();
    const onDone = vi.fn();
    render(
      <LabPractice
        targetSentence={SENTENCE}
        entry="learn_feedback"
        position={{ index: 0, total: 3 }}
        onNextSentence={onNextSentence}
        onResult={onResult}
        onDone={onDone}
        trackOpen={false}
      />,
    );
    expect(screen.getByTestId('lab-position').textContent).toBe('Sentence 1 of 3');
    expect(trackMock).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'lab_opened' }));
    expect(screen.getByRole('button', { name: 'Skip this sentence' })).toBeTruthy();

    await recordTake(/Tap and say the sentence/);
    expect(screen.getByText('Say this sentence again', { exact: false })).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Next sentence' }));
    expect(onNextSentence).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ total: 6, firstClear: 4, bestClear: 4, fixedInPractice: 0, takes: 1 });
    expect(onDone).not.toHaveBeenCalled();

    await click(screen.getByRole('button', { name: 'Stop here' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports nothing for a sentence skipped without a take, and uses the leave label it is given', async () => {
    const onResult = vi.fn();
    const onDone = vi.fn();
    render(<LabPractice targetSentence={SENTENCE} entry="learn_feedback" doneLabel="Done — next question" onResult={onResult} onDone={onDone} />);
    expect(screen.queryByTestId('lab-position')).toBeNull();
    await click(screen.getByRole('button', { name: 'Done — next question' }));
    expect(onResult).toHaveBeenCalledWith(null);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
