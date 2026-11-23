// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const audio = vi.hoisted(() => ({
  playNative: vi.fn(async (): Promise<string> => 'recorded'),
  stopNative: vi.fn(),
}));
vi.mock('../../../pronunciation/audio/nativeVoice', () => ({ playNative: audio.playNative, stopNative: audio.stopNative }));

import { SayItBetterActions } from '../SayItBetterActions';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  audio.playNative.mockImplementation(async () => 'recorded');
});

describe('SayItBetterActions', () => {
  it('plays the corrected answer one sentence at a time, recording a missing one on demand', async () => {
    render(<SayItBetterActions sentence="J'habite à Londres. J'aime le football." onPractise={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Hear it/ }));
    });
    expect(audio.playNative).toHaveBeenCalledTimes(2);
    expect(audio.playNative).toHaveBeenNthCalledWith(1, "J'habite à Londres.", expect.objectContaining({ synthesize: true }));
    expect(audio.playNative).toHaveBeenNthCalledWith(2, "J'aime le football.", expect.objectContaining({ synthesize: true }));
  });

  it('stops at the first sentence that cannot be played and says so', async () => {
    audio.playNative.mockImplementation(async () => 'unavailable');
    render(<SayItBetterActions sentence="J'habite à Londres. J'aime le football." onPractise={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Hear it/ }));
    });
    expect(audio.playNative).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Native audio isn’t available/)).toBeTruthy();
  });

  it('opens the practice from "Practise saying it"', () => {
    const onPractise = vi.fn();
    render(<SayItBetterActions sentence="Les enfants jouent." onPractise={onPractise} />);
    fireEvent.click(screen.getByRole('button', { name: /Practise saying it/ }));
    expect(onPractise).toHaveBeenCalledTimes(1);
  });
});
