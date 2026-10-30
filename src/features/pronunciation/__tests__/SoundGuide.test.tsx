// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const audio = vi.hoisted(() => ({ playNative: vi.fn(async (): Promise<string> => 'recorded'), stopNative: vi.fn() }));
vi.mock('../audio/nativeVoice', () => ({ playNative: audio.playNative, stopNative: audio.stopNative }));

import { SOUND_TIPS } from '../../../domain/pronunciation/lab/tips';
import { SoundGuide } from '../SoundGuide';

afterEach(() => {
  cleanup();
  audio.playNative.mockClear();
  audio.playNative.mockImplementation(async () => 'recorded');
});

function renderGuide(props: Partial<Parameters<typeof SoundGuide>[0]> = {}) {
  const handlers = { onSayWord: vi.fn(), onEarTraining: vi.fn(), onSentences: vi.fn() };
  render(<SoundGuide family="uOu" status="notEnoughData" {...handlers} {...props} />);
  return handlers;
}

describe('SoundGuide', () => {
  it('shows the name, the mouth tip, a status and every example', () => {
    renderGuide();
    expect(screen.getByRole('heading', { name: 'U and OU' })).toBeTruthy();
    expect(screen.getByText(SOUND_TIPS.uOu.tip)).toBeTruthy();
    expect(screen.getByText('Not enough data yet')).toBeTruthy();
    for (const word of SOUND_TIPS.uOu.examples) expect(screen.getByRole('button', { name: `Hear « ${word} »` })).toBeTruthy();
  });

  it('plays an example through the native voice, never asking the backend to record it', async () => {
    renderGuide();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hear « tout »' })); });
    expect(audio.playNative).toHaveBeenCalledWith('tout', expect.not.objectContaining({ synthesize: true }));
  });

  it('shows the minimal pair as two play buttons', () => {
    renderGuide();
    expect(screen.getByRole('button', { name: 'Hear the pair word « tu »' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hear the pair word « tout »' })).toBeTruthy();
  });

  it('"Say it" hands the word to the Lab; the other buttons go on', () => {
    const h = renderGuide();
    fireEvent.click(screen.getByRole('button', { name: 'Say « rue »' }));
    expect(h.onSayWord).toHaveBeenCalledWith('rue');
    fireEvent.click(screen.getByRole('button', { name: /Ear training for this sound/ }));
    fireEvent.click(screen.getByRole('button', { name: /Practise sentences with this sound/ }));
    expect(h.onEarTraining).toHaveBeenCalled();
    expect(h.onSentences).toHaveBeenCalled();
  });

  it('a text-only sound (liaison) has no status chip and says it is taught, not scored', () => {
    renderGuide({ family: 'liaison', status: null });
    expect(screen.queryByText('Not enough data yet')).toBeNull();
    expect(screen.getByText(/taught|teaches/)).toBeTruthy();
  });

  it('a sound with no minimal pair or ear-training pairs has no ear-training button', () => {
    renderGuide({ family: 'frenchR', status: 'clear' });
    expect(screen.queryByRole('button', { name: /Ear training for this sound/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Practise sentences/ })).toBeTruthy();
  });

  it('says so when native audio cannot play on this device', async () => {
    audio.playNative.mockImplementation(async () => 'unavailable');
    renderGuide();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hear « tout »' })); });
    expect(screen.getByText(/Native audio isn’t available/)).toBeTruthy();
  });
});
