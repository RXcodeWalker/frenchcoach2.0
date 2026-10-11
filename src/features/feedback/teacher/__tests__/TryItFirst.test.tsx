// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const recorder = {
  isRecording: false,
  sttSupported: true,
  start: vi.fn(),
  stop: vi.fn(async () => 'je suis allé'),
};
vi.mock('../../../recording/useRecording', () => ({ useRecording: () => recorder }));
vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
const track = vi.fn();
vi.mock('../../../../services/telemetry/telemetryService', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('../../../../services/tts/ttsService', () => ({
  TTS: { isSupported: () => false, stop: vi.fn(), speak: vi.fn(), ensureVoiceReady: vi.fn(), hasFrenchVoice: () => true },
}));

import { TryItFirst } from '../TryItFirst';

const FIX = {
  kind: 'fix' as const,
  quote: "j'ai allé",
  correction: 'je suis allé',
  why: 'Aller takes être.',
  tag: 'Être vs Avoir',
};

const type = (value: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value } });

beforeEach(() => {
  recorder.isRecording = false;
  recorder.start.mockClear();
  recorder.stop.mockClear();
  track.mockClear();
});
afterEach(cleanup);

describe('TryItFirst', () => {
  it('starts as a nudge: the learner’s words and the kind of slip, never the correction', () => {
    const { container } = render(<TryItFirst fix={FIX} />);
    expect(container.textContent).toContain("« j'ai allé » — something's off here (Être vs Avoir). Can you fix it?");
    expect(container.textContent).not.toContain('je suis allé');
    expect(container.textContent).not.toContain('Aller takes être.');
  });

  it('a clear match says yes and reveals the fix', () => {
    const onResolved = vi.fn();
    const { container } = render(<TryItFirst fix={FIX} onResolved={onResolved} />);
    type('Hier je suis allé au cinéma');
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(container.textContent).toContain("Yes, that's it.");
    expect(container.textContent).toContain('je suis allé');
    expect(container.textContent).toContain('Aller takes être.');
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it('Enter checks the typed fix too', () => {
    const { container } = render(<TryItFirst fix={FIX} />);
    type('je suis allé');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(container.textContent).toContain("Yes, that's it.");
  });

  it('anything else still reveals the answer, as "how I\'d say it" — a valid alternative is never marked wrong', () => {
    const { container } = render(<TryItFirst fix={FIX} />);
    type('on est allé');
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(container.textContent).toContain("Here's how I'd say it:");
    expect(container.textContent).toContain('je suis allé');
    expect(container.textContent).not.toContain("Yes, that's it.");
  });

  it('"Just show me" reveals the answer with no verdict line at all', () => {
    const onResolved = vi.fn();
    const { container } = render(<TryItFirst fix={FIX} onResolved={onResolved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Just show me' }));
    expect(container.textContent).toContain('je suis allé');
    expect(container.textContent).not.toContain("Yes, that's it.");
    expect(container.textContent).not.toContain("Here's how I'd say it");
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it('cannot check an empty attempt', () => {
    render(<TryItFirst fix={FIX} />);
    expect((screen.getByRole('button', { name: 'Check' }) as HTMLButtonElement).disabled).toBe(true);
    type('   ');
    expect((screen.getByRole('button', { name: 'Check' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('never says wrong or close, in any state', () => {
    const states: Array<() => void> = [
      () => undefined,
      () => { type('je suis allé'); fireEvent.click(screen.getByRole('button', { name: 'Check' })); },
      () => { type('nous allons'); fireEvent.click(screen.getByRole('button', { name: 'Check' })); },
      () => fireEvent.click(screen.getByRole('button', { name: 'Just show me' })),
    ];
    for (const run of states) {
      const { container, unmount } = render(<TryItFirst fix={FIX} />);
      run();
      expect(container.textContent).not.toMatch(/\b(wrong|incorrect|close|almost|nearly|not quite|mistake)\b/i);
      unmount();
    }
  });

  it('writes nothing: no storage, no analytics', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<TryItFirst fix={FIX} />);
    type('je suis allé');
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(setItem).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('can be answered aloud: say it, stop, and the spoken attempt is checked', async () => {
    const onMicActive = vi.fn();
    const { container, rerender } = render(<TryItFirst fix={FIX} onMicActive={onMicActive} />);
    fireEvent.click(screen.getByRole('button', { name: 'Say your fix' }));
    expect(recorder.start).toHaveBeenCalledTimes(1);
    expect(onMicActive).toHaveBeenLastCalledWith(true);

    recorder.isRecording = true;
    rerender(<TryItFirst fix={FIX} onMicActive={onMicActive} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop and check what you said' }));
    });
    expect(onMicActive).toHaveBeenLastCalledWith(false);
    expect(container.textContent).toContain("Yes, that's it.");
  });

  it('only one microphone at a time, and no mic where speech recognition is unavailable', () => {
    const { rerender } = render(<TryItFirst fix={FIX} micLocked />);
    expect((screen.getByRole('button', { name: 'Say your fix' }) as HTMLButtonElement).disabled).toBe(true);
    recorder.sttSupported = false;
    rerender(<TryItFirst fix={FIX} />);
    expect(screen.queryByRole('button', { name: 'Say your fix' })).toBeNull();
    recorder.sttSupported = true;
  });
});
