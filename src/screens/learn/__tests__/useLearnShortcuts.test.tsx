// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useLearnShortcuts } from '../useLearnShortcuts';
import { setChordPending } from '../../../lib/keyboardShortcuts';

afterEach(() => {
  cleanup();
  setChordPending(false);
});

function Harness(props: { canAnswer: boolean; inFeedback: boolean; onHint: () => void; onSkip: () => void; onNext?: () => void }) {
  useLearnShortcuts(props);
  return (
    <>
      <textarea aria-label="note" />
      {props.inFeedback && <button data-shortcut="continue" onClick={props.onNext}>Next question</button>}
    </>
  );
}

const key = (k: string, init: KeyboardEventInit = {}, target: Element | Document = document.body) =>
  fireEvent.keyDown(target, { key: k, ...init });

describe('useLearnShortcuts', () => {
  it('h toggles the hint and s skips while a question is showing', () => {
    const onHint = vi.fn();
    const onSkip = vi.fn();
    render(<Harness canAnswer inFeedback={false} onHint={onHint} onSkip={onSkip} />);
    key('h');
    key('s');
    expect(onHint).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('n presses the on-screen Next button only in feedback', () => {
    const onNext = vi.fn();
    const { rerender } = render(<Harness canAnswer inFeedback={false} onHint={vi.fn()} onSkip={vi.fn()} onNext={onNext} />);
    key('n');
    expect(onNext).not.toHaveBeenCalled();
    rerender(<Harness canAnswer={false} inFeedback onHint={vi.fn()} onSkip={vi.fn()} onNext={onNext} />);
    key('n');
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not act when recording/processing, or when the screen is in feedback', () => {
    const onHint = vi.fn();
    const onSkip = vi.fn();
    render(<Harness canAnswer={false} inFeedback onHint={onHint} onSkip={onSkip} />);
    key('h');
    key('s');
    expect(onHint).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('leaves Shift+letter (navigation), a pending g chord, typing, modifiers and dialogs alone', () => {
    const onHint = vi.fn();
    const onSkip = vi.fn();
    const { getByLabelText } = render(<Harness canAnswer inFeedback={false} onHint={onHint} onSkip={onSkip} />);
    key('H', { shiftKey: true });
    key('h', { ctrlKey: true });
    key('h', {}, getByLabelText('note'));
    setChordPending(true);
    key('h');
    setChordPending(false);
    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    key('h');
    dialog.remove();
    expect(onHint).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
  });
});

describe('useLearnShortcuts undo', () => {
  function UndoHarness(props: { canUndo: boolean; onUndo: () => void }) {
    useLearnShortcuts({ canAnswer: true, inFeedback: false, onHint: vi.fn(), onSkip: vi.fn(), ...props });
    return null;
  }

  it('u undoes a skip only while it is on offer', () => {
    const onUndo = vi.fn();
    const { rerender } = render(<UndoHarness canUndo={false} onUndo={onUndo} />);
    fireEvent.keyDown(document.body, { key: 'u' });
    expect(onUndo).not.toHaveBeenCalled();
    rerender(<UndoHarness canUndo onUndo={onUndo} />);
    fireEvent.keyDown(document.body, { key: 'u' });
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
