// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useSpaceToRecord } from '../useSpaceToRecord';

function Probe(props: { enabled?: boolean; isRecording?: boolean; onStart: () => void; onStop: () => void }) {
  useSpaceToRecord({ enabled: props.enabled ?? true, isRecording: props.isRecording ?? false, onStart: props.onStart, onStop: props.onStop });
  return (
    <div>
      <button>Hint</button>
      <a href="/x">Link</a>
      <input aria-label="field" />
    </div>
  );
}

afterEach(cleanup);

describe('useSpaceToRecord', () => {
  it('starts on Space with nothing focused', () => {
    const onStart = vi.fn();
    render(<Probe onStart={onStart} onStop={vi.fn()} />);
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('still records when a button (e.g. Hint) kept focus', () => {
    const onStart = vi.fn();
    const { getByText } = render(<Probe onStart={onStart} onStop={vi.fn()} />);
    const btn = getByText('Hint');
    btn.focus();
    fireEvent.keyDown(btn, { code: 'Space', key: ' ' });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('stops while recording', () => {
    const onStop = vi.fn();
    render(<Probe isRecording onStart={vi.fn()} onStop={onStop} />);
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('leaves typing fields, links, dialogs and disabled screens alone', () => {
    const onStart = vi.fn();
    const { getByLabelText, getByText, rerender } = render(<Probe onStart={onStart} onStop={vi.fn()} />);
    fireEvent.keyDown(getByLabelText('field'), { code: 'Space', key: ' ' });
    fireEvent.keyDown(getByText('Link'), { code: 'Space', key: ' ' });
    const dlg = document.createElement('div');
    dlg.setAttribute('aria-modal', 'true');
    document.body.appendChild(dlg);
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    dlg.remove();
    rerender(<Probe enabled={false} onStart={onStart} onStop={vi.fn()} />);
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(onStart).not.toHaveBeenCalled();
  });
});
