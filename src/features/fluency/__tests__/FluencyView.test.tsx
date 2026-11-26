// @vitest-environment jsdom
// fluency-trainer §2: the honesty note comes first; no trend before enough answers; missing speed is a dash.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { buildFluencyProfile, MIN_TREND_SAMPLES, type FlowSample } from '../../../domain/fluency/fluencyProfile';
import { metrics } from '../../../domain/fluency/__tests__/fixtures';
import { FluencyView } from '../FluencyView';
import { FLOW_NOT_A_GRADE, UNVALIDATED_NOTE } from '../fluencyCopy';

const sample = (i: number, over: Partial<FlowSample> = {}): FlowSample => ({ ...metrics(), at: new Date(Date.UTC(2026, 9, 1, 12, i)).toISOString(), topicKey: 'school', ...over });

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

describe('FluencyView', () => {
  it('shows the honesty note and the empty state with no answers', () => {
    render(<FluencyView profile={buildFluencyProfile([])} drills={[]} firstTake={null} onStartDrill={vi.fn()} />);
    expect(screen.getByText(FLOW_NOT_A_GRADE)).toBeTruthy();
    expect(screen.getByText(UNVALIDATED_NOTE)).toBeTruthy();
    expect(screen.getByTestId('fluency-empty')).toBeTruthy();
    expect(screen.queryByTestId('fluency-now')).toBeNull();
  });

  it('shows "now" but waits for a trend until there are enough answers', () => {
    const p = buildFluencyProfile(Array.from({ length: MIN_TREND_SAMPLES }, (_, i) => sample(i)));
    render(<FluencyView profile={p} drills={[]} firstTake={null} onStartDrill={vi.fn()} />);
    expect(screen.getByTestId('fluency-now')).toBeTruthy();
    expect(screen.getByText(/A trend appears after 10 spoken answers/)).toBeTruthy();
    expect(screen.queryByTestId('fluency-trend-changes')).toBeNull();
  });

  it('shows a dash, never a zero, when no words were heard', () => {
    const p = buildFluencyProfile([sample(0, { wordsPerMinute: null, wordsPerRun: null })]);
    render(<FluencyView profile={p} drills={[]} firstTake={null} onStartDrill={vi.fn()} />);
    expect(screen.getByTestId('now-wordsPerMinute').textContent).toContain('–');
    expect(screen.getByTestId('flow-chart-empty')).toBeTruthy();
  });

  it('suggests a drill on the slowest topic', () => {
    const samples = [
      ...[0, 1, 2].map((i) => sample(i, { topicKey: 'school', wordsPerMinute: 120 })),
      ...[3, 4, 5].map((i) => sample(i, { topicKey: 'family', wordsPerMinute: 80 })),
    ];
    const onStartDrill = vi.fn();
    render(<FluencyView profile={buildFluencyProfile(samples)} drills={[]} firstTake={null} onStartDrill={onStartDrill} />);
    expect(screen.getByText(/most slowly in Family & Friends/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('fluency-start-drill'));
    expect(onStartDrill).toHaveBeenCalledWith('family');
  });
});
