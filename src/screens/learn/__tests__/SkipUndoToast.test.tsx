// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SkipUndoToast } from '../SkipUndoToast';

afterEach(cleanup);

describe('SkipUndoToast', () => {
  it('offers Undo and Dismiss', () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    render(<SkipUndoToast onUndo={onUndo} onDismiss={onDismiss} />);
    expect(screen.getByRole('status').textContent).toContain('Question skipped');
    fireEvent.click(screen.getByText('Undo'));
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
