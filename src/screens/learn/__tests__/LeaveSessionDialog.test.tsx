// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LeaveSessionDialog } from '../LeaveSessionDialog';

afterEach(cleanup);

describe('LeaveSessionDialog', () => {
  it('renders nothing when closed', () => {
    render(<LeaveSessionDialog open={false} answered={0} onStay={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('focuses "Keep practising" and stays on Escape', () => {
    const onStay = vi.fn();
    const onLeave = vi.fn();
    render(<LeaveSessionDialog open answered={2} onStay={onStay} onLeave={onLeave} />);
    expect(document.activeElement).toBe(screen.getByText('Keep practising'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('leaves only through the Leave button', () => {
    const onLeave = vi.fn();
    render(<LeaveSessionDialog open answered={1} onStay={vi.fn()} onLeave={onLeave} />);
    fireEvent.click(screen.getByText('Leave session'));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('says what happens to the answers', () => {
    const { rerender } = render(<LeaveSessionDialog open answered={0} onStay={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.getByText(/nothing will be saved/)).toBeTruthy();
    rerender(<LeaveSessionDialog open answered={1} onStay={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.getByText(/summary of the 1 question you've answered/)).toBeTruthy();
    rerender(<LeaveSessionDialog open answered={3} onStay={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.getByText(/the 3 questions/)).toBeTruthy();
  });
});
