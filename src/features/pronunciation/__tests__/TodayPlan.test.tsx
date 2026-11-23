// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptyLabHistory } from '../../../domain/pronunciation/lab/labHistory';
import { buildTodayPlan } from '../../../domain/pronunciation/lab/todayPlan';
import { TodayPlan } from '../TodayPlan';

afterEach(cleanup);

const STEPS = buildTodayPlan(emptyLabHistory(), '2026-11-23');

describe('TodayPlan', () => {
  it('lists the steps in order and starts the one tapped', () => {
    const onStart = vi.fn();
    render(<TodayPlan steps={STEPS} done={new Set()} onStart={onStart} />);
    expect(screen.getByRole('heading', { name: 'Today’s 5 minutes' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('plan-ear'));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ kind: 'ear' }));
  });

  it('ticks finished steps, offers them again, and says how many are done', () => {
    render(<TodayPlan steps={STEPS} done={new Set(['sentence'])} onStart={vi.fn()} />);
    expect(screen.getByTestId('plan-sentence').textContent).toMatch(/Done — tap to do it again/);
    expect(screen.getByRole('status').textContent).toBe('1 of 2 done.');
  });

  it('finishes with a calm line, never a score', () => {
    render(<TodayPlan steps={STEPS} done={new Set(['sentence', 'ear'])} onStart={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toMatch(/today’s practice done/);
    expect(document.body.textContent).not.toMatch(/\b\d{2,3}\b|wrong|%/);
  });
});
