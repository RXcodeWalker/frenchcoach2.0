// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const tts = {
  supported: true,
  french: true,
  speak: vi.fn<(text: string) => Promise<void>>(async () => undefined),
  stop: vi.fn(),
  ensureVoiceReady: vi.fn(async () => undefined),
};
vi.mock('../../../../services/tts/ttsService', () => ({
  TTS: {
    isSupported: () => tts.supported,
    hasFrenchVoice: () => tts.french,
    speak: (t: string) => tts.speak(t),
    stop: () => tts.stop(),
    ensureVoiceReady: () => tts.ensureVoiceReady(),
  },
}));

import { SpeakButton } from '../SpeakButton';

beforeEach(() => {
  tts.supported = true;
  tts.french = true;
  tts.speak.mockClear();
});
afterEach(cleanup);

describe('SpeakButton', () => {
  it('speaks the correction in French', async () => {
    render(<SpeakButton text="je suis allé" />);
    await fireEvent.click(screen.getByRole('button', { name: 'Hear the correction' }));
    await vi.waitFor(() => expect(tts.speak).toHaveBeenCalledWith('je suis allé'));
  });

  it('is absent where there is no speech synthesis', () => {
    tts.supported = false;
    const { container } = render(<SpeakButton text="je suis allé" />);
    expect(container.firstChild).toBeNull();
  });

  it('goes quiet, with a reason, when there is no French voice — never reads French in an English voice', async () => {
    tts.french = false;
    render(<SpeakButton text="je suis allé" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hear the correction' }));
    const quiet = await screen.findByRole('button', { name: 'No French voice is available on this device' });
    expect((quiet as HTMLButtonElement).disabled).toBe(true);
    expect(tts.speak).not.toHaveBeenCalled();
  });
});
