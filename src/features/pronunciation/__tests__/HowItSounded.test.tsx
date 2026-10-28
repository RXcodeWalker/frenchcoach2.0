// @vitest-environment jsdom
//
// pronunciation-lab Stage 3 — "How it sounded" (plan §3.1). Owner D1: no word
// analysis of a free answer, so the card never calls /api/pronunciation and
// shows no score, sub-score or coloured word.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const assessMock = vi.fn();
vi.mock('../../../services/pronunciation/pronunciationClient', () => ({
  assessPronunciation: (...args: unknown[]) => assessMock(...args),
}));
const audio = vi.hoisted(() => ({
  playClip: vi.fn(async () => true),
  stopClip: vi.fn(),
  playNative: vi.fn(async (): Promise<string> => 'browser'),
  stopNative: vi.fn(),
  pauses: vi.fn(async (): Promise<{ pausesOver2s: number; longestPauseS: number } | null> => ({ pausesOver2s: 0, longestPauseS: 0.4 })),
}));
vi.mock('../audio/clipPlayer', () => ({ playClip: audio.playClip, stopClip: audio.stopClip }));
vi.mock('../audio/nativeVoice', () => ({ playNative: audio.playNative, stopNative: audio.stopNative }));
vi.mock('../audio/answerPauses', () => ({ measureAnswerPauses: audio.pauses }));
const labProps = vi.fn();
vi.mock('../LabPractice', () => ({
  LabPractice: (props: { targetSentence: string; entry: string; onDone: () => void }) => {
    labProps(props);
    return (
      <div data-testid="lab-practice">
        <button onClick={props.onDone}>Done</button>
      </div>
    );
  },
}));

import { HowItSounded } from '../HowItSounded';

const SENTENCE = 'Les enfants jouent dans le jardin.';
const BLOB = new Blob(['x'], { type: 'audio/webm' });

function stubReducedMotion() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
}

async function renderCard(props: Partial<Parameters<typeof HowItSounded>[0]> = {}) {
  const view = render(<HowItSounded answerBlob={BLOB} sentence={SENTENCE} {...props} />);
  await act(async () => {});
  return view;
}

beforeEach(() => {
  stubReducedMotion();
  audio.pauses.mockImplementation(async () => ({ pausesOver2s: 0, longestPauseS: 0.4 }));
  audio.playNative.mockImplementation(async () => 'browser');
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('How it sounded', () => {
  it('plays your answer and the corrected sentence, with one slow toggle for both', async () => {
    await renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Your answer' }));
    expect(audio.playClip).toHaveBeenLastCalledWith(BLOB, null, { rate: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Native' }));
    expect(audio.playNative).toHaveBeenLastCalledWith(SENTENCE, expect.objectContaining({ speed: 1, synthesize: true }));

    const slow = screen.getByRole('button', { name: 'Slow (0.75×)' });
    expect(slow.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(slow);
    expect(slow.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Your answer' }));
    expect(audio.playClip).toHaveBeenLastCalledWith(BLOB, null, { rate: 0.75 });
    fireEvent.click(screen.getByRole('button', { name: 'Native' }));
    expect(audio.playNative).toHaveBeenLastCalledWith(SENTENCE, expect.objectContaining({ speed: 0.75, synthesize: true }));
  });

  it('says the native voice is being prepared while a new corrected sentence is recorded (Stage 4b)', async () => {
    let finish: (v: string) => void = () => {};
    audio.playNative.mockImplementation(((_text: string, opts: { onPreparing?: () => void }) => {
      opts.onPreparing?.();
      return new Promise<string>((resolve) => { finish = resolve; });
    }) as never);
    await renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Native' }));
    expect(screen.getByText('Getting the native voice ready…')).toBeTruthy();
    await act(async () => { finish('recorded'); });
    expect(screen.queryByText('Getting the native voice ready…')).toBeNull();
  });

  it('says how the answer flowed, from pauses measured on the recording', async () => {
    await renderCard();
    expect(audio.pauses).toHaveBeenCalledWith(BLOB);
    expect(screen.getByText('Smooth — no long pauses.')).toBeTruthy();
    cleanup();
    audio.pauses.mockImplementation(async () => ({ pausesOver2s: 2, longestPauseS: 3.1 }));
    await renderCard();
    expect(screen.getByText('2 pauses over 2 seconds — try linking your ideas with et, mais, parce que.')).toBeTruthy();
  });

  it('says nothing about flow when the pauses could not be measured', async () => {
    audio.pauses.mockImplementation(async () => null);
    await renderCard();
    expect(screen.queryByText('Flow')).toBeNull();
  });

  it('a typed answer has no recording: no Your answer, no flow, but Native and Practise remain', async () => {
    await renderCard({ answerBlob: null });
    expect(screen.queryByRole('button', { name: 'Your answer' })).toBeNull();
    expect(audio.pauses).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Native' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Practise it/ })).toBeTruthy();
  });

  it('watch out for: at most 3 features of the corrected sentence, each plays its word', async () => {
    await renderCard();
    const chips = screen.getAllByRole('button', { name: /^Hear « / });
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.length).toBeLessThanOrEqual(3);
    const liaison = screen.getByRole('button', { name: 'Hear « les enfants » — Liaison' });
    fireEvent.click(liaison);
    expect(audio.playNative).toHaveBeenLastCalledWith('les enfants', expect.objectContaining({ speed: 1, synthesize: false }));
  });

  it('Practise it opens the Lab on the corrected sentence in place, and Done comes back', async () => {
    const onPractiseOpened = vi.fn();
    await renderCard({ onPractiseOpened });
    fireEvent.click(screen.getByRole('button', { name: /Practise it/ }));
    expect(onPractiseOpened).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('lab-practice')).toBeTruthy();
    expect(labProps).toHaveBeenLastCalledWith(expect.objectContaining({ targetSentence: SENTENCE, entry: 'how_it_sounded' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByTestId('how-it-sounded')).toBeTruthy();
  });

  it('never asks for a pronunciation analysis and shows no score or word verdict (owner D1, D5)', async () => {
    const { container } = await renderCard();
    expect(assessMock).not.toHaveBeenCalled();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\/100|score|accuracy|fluency|completeness|clear|almost|practise this|not heard/i);
  });

  it('says so when native audio cannot play on this device', async () => {
    audio.playNative.mockImplementation(async () => 'unavailable');
    await renderCard();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Native' }));
    });
    expect(screen.getByText('Native audio isn’t available on this device.')).toBeTruthy();
  });

  it('renders nothing with neither a recording nor a sentence', async () => {
    const { container } = await renderCard({ answerBlob: null, sentence: '  ' });
    expect(container.textContent).toBe('');
  });
});
