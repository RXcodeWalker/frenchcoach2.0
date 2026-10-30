// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecordingPanel } from '../RecordingPanel';
import type { RecordingState } from '../../../features/recording/useRecording';

afterEach(cleanup);

function makeRecording(isRecording: boolean) {
  return {
    isRecording,
    elapsedTime: 0,
    waveData: Array(12).fill(4),
    transcript: '',
    audioBlob: null,
    lastActivityAt: null,
    micLevel: { level: 0 },
    start: vi.fn(),
    stop: vi.fn(),
    audioBlobPromise: vi.fn(),
    sttSupported: true,
    sttError: null,
  } as unknown as RecordingState;
}

const space = (target: Element | Document = document.body) => fireEvent.keyDown(target, { key: ' ', code: 'Space' });

describe('RecordingPanel Space shortcut', () => {
  it('starts a recording', () => {
    const recording = makeRecording(false);
    render(<RecordingPanel isActive recording={recording} onStop={vi.fn()} />);
    space();
    expect(recording.start).toHaveBeenCalledTimes(1);
  });

  it('stops a recording', () => {
    const onStop = vi.fn();
    render(<RecordingPanel isActive recording={makeRecording(true)} onStop={onStop} />);
    space();
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('leaves Space to a focused button, a text field and an open dialog', () => {
    const recording = makeRecording(false);
    render(
      <>
        <RecordingPanel isActive recording={recording} onStop={vi.fn()} />
        <textarea aria-label="note" />
      </>,
    );
    space(screen.getByRole('button', { name: 'Record your answer' }));
    space(screen.getByLabelText('note'));
    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    space();
    dialog.remove();
    expect(recording.start).not.toHaveBeenCalled();
  });

  it('does nothing while the answer is processing or the panel is inactive', () => {
    const recording = makeRecording(false);
    const { rerender } = render(<RecordingPanel isActive recording={recording} onStop={vi.fn()} processing={0} />);
    space();
    rerender(<RecordingPanel isActive={false} recording={recording} onStop={vi.fn()} />);
    space();
    expect(recording.start).not.toHaveBeenCalled();
  });
});
