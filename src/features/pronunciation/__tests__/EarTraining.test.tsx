// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const audio = vi.hoisted(() => ({ playNative: vi.fn<(text: unknown, opts?: unknown) => Promise<string>>(async () => 'recorded'), stopNative: vi.fn() }));
vi.mock('../audio/nativeVoice', () => ({ playNative: audio.playNative, stopNative: audio.stopNative }));
const trackMock = vi.fn();
vi.mock('../../../services/telemetry/telemetryService', () => ({ track: (...a: unknown[]) => trackMock(...a), captureError: vi.fn() }));
const assessMock = vi.fn();
vi.mock('../../../services/pronunciation/pronunciationClient', () => ({ assessPronunciation: (...a: unknown[]) => assessMock(...a) }));

import { EAR_ROUND_SIZE } from '../../../domain/pronunciation/lab/earTraining';
import { EarTraining } from '../EarTraining';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(() => {
  cleanup();
  audio.playNative.mockClear();
  trackMock.mockReset();
});

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
}

/** Plays the word, then returns it (what the learner heard). */
async function playWord(): Promise<string> {
  await click(screen.getByTestId('ear-play'));
  return audio.playNative.mock.calls[audio.playNative.mock.calls.length - 1][0] as string;
}

describe('EarTraining', () => {
  it('plays one word of the pair as a recording only: no microphone, no request, no synthesis', async () => {
    render(<EarTraining />);
    const heard = await playWord();
    expect(typeof heard).toBe('string');
    expect(audio.playNative).toHaveBeenCalledWith(heard, expect.not.objectContaining({ synthesize: true }));
    expect(assessMock).not.toHaveBeenCalled();
    expect(screen.getByTestId(`ear-option-${heard}`)).toBeTruthy();
  });

  it('right answer: "Yes", then both words can be replayed', async () => {
    render(<EarTraining />);
    const heard = await playWord();
    await click(screen.getByTestId(`ear-option-${heard}`));
    expect(screen.getByText(`Yes — « ${heard} ».`)).toBeTruthy();
    expect(screen.getByRole('button', { name: `Hear « ${heard} »` })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('a miss never says wrong; it names the word and offers both to hear', async () => {
    render(<EarTraining />);
    const heard = await playWord();
    const buttons = screen.getAllByTestId(/^ear-option-/);
    const other = buttons.find((b) => b.getAttribute('data-testid') !== `ear-option-${heard}`)!;
    await click(other);
    expect(screen.getByText(new RegExp(`That one was « ${heard} »`))).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\bwrong\b/i);
  });

  it('a whole round: summary line, one analytics event with counts only, and another round', async () => {
    render(<EarTraining />);
    let right = 0;
    for (let i = 0; i < EAR_ROUND_SIZE; i++) {
      const heard = await playWord();
      const buttons = screen.getAllByTestId(/^ear-option-/);
      // Get the first two right and the rest "wrong" so the tally is checked, not assumed.
      const pick = i < 2 ? buttons.find((b) => b.getAttribute('data-testid') === `ear-option-${heard}`)! : buttons.find((b) => b.getAttribute('data-testid') !== `ear-option-${heard}`)!;
      if (i < 2) right += 1;
      await click(pick);
      await click(screen.getByRole('button', { name: i + 1 < EAR_ROUND_SIZE ? 'Next' : 'See how it went' }));
    }
    expect(screen.getByTestId('ear-summary').textContent).toContain(`${right} of ${EAR_ROUND_SIZE} right`);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({ name: 'ear_training_round', props: { correct: right, total: EAR_ROUND_SIZE } });
    await click(screen.getByRole('button', { name: 'Another round' }));
    expect(screen.queryByTestId('ear-summary')).toBeNull();
    expect(screen.getByTestId('ear-play')).toBeTruthy();
  });

  it('can be limited to one sound; a sound without pairs is not offered', async () => {
    render(<EarTraining initialFamily="uOu" />);
    expect(screen.getByRole('button', { name: 'U and OU' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'The French R' })).toBeNull();
    const heard = await playWord();
    expect(['tu', 'tout', 'dessus', 'dessous', 'rue', 'roue', 'du', 'doux', 'vu', 'vous', 'pur', 'pour']).toContain(heard);
  });

  it('switching sound starts a fresh round', async () => {
    render(<EarTraining />);
    await click(screen.getByRole('button', { name: 'Liaison' }));
    const heard = await playWord();
    expect(['ils sont', 'ils ont', 'nous avons', 'nous savons']).toContain(heard);
  });

  it('says so when native audio is not available here', async () => {
    audio.playNative.mockImplementationOnce(async () => 'unavailable');
    render(<EarTraining />);
    await playWord();
    expect(screen.getByText(/Native audio isn’t available/)).toBeTruthy();
  });
});
