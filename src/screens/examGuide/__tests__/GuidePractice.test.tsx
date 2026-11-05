// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  ANSWER_FIT,
  EXAM_PARTS,
  MODE_GOALS,
  SORT_ITEMS,
  STUCK_STEPS,
  TIME_FRAME_ITEMS,
} from '../../../features/examGuide/guideContent';
import { AnswerTheQuestion, ModePicker, OrderTheExam, SortTheMarks, SpotTheTimeFrame, StuckWalkthrough } from '../GuidePractice';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

function inRouter(node: React.ReactNode) {
  render(
    <MemoryRouter initialEntries={['/exam/guide']}>
      <Routes>
        <Route path="/exam/guide" element={node} />
        <Route path="/learn" element={<p>Learn screen</p>} />
        <Route path="/exam" element={<p>Exam screen</p>} />
        <Route path="/exam/role-play" element={<p>Drill screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('guide practice exercises', () => {
  it('order: a wrong tap is refused, the right order completes', () => {
    inRouter(<OrderTheExam />);
    fireEvent.click(screen.getByTestId('guide-order-topic2'));
    expect(screen.getByText(/something else comes before/)).toBeTruthy();
    for (const p of EXAM_PARTS) fireEvent.click(screen.getByTestId(`guide-order-${p.id}`));
    expect(screen.getByText('That’s the order.')).toBeTruthy();
  });

  it('order: no mistakes is a perfect round', () => {
    inRouter(<OrderTheExam />);
    for (const p of EXAM_PARTS) fireEvent.click(screen.getByTestId(`guide-order-${p.id}`));
    expect(screen.getByText('Perfect, first time.')).toBeTruthy();
  });

  it('sort: explains each statement and scores the round', () => {
    inRouter(<SortTheMarks />);
    for (const item of SORT_ITEMS) {
      fireEvent.click(screen.getByTestId(`guide-sort-${item.area}`));
      expect(screen.getByText(item.why)).toBeTruthy();
      fireEvent.click(screen.getByTestId('guide-sort-next'));
    }
    expect(screen.getByTestId('guide-sort-done').textContent).toMatch(`${SORT_ITEMS.length} of ${SORT_ITEMS.length}`);
  });

  it('answer fit: a wrong pick shows the reason, and only right picks score', () => {
    inRouter(<AnswerTheQuestion />);
    ANSWER_FIT.forEach((q, i) => {
      const pick = i === 0 ? (q.answer + 1) % q.options.length : q.answer;
      fireEvent.click(screen.getByTestId(`guide-fit-${q.id}-${pick}`));
      expect(screen.getByText(q.why)).toBeTruthy();
      fireEvent.click(screen.getByTestId('guide-fit-next'));
    });
    expect(screen.getByTestId('guide-fit-done').textContent).toMatch(`${ANSWER_FIT.length - 1} of ${ANSWER_FIT.length}`);
  });

  it('time frame: each sentence reveals its clue', () => {
    inRouter(<SpotTheTimeFrame />);
    for (const item of TIME_FRAME_ITEMS) {
      fireEvent.click(screen.getByTestId(`guide-tense-${item.frame}`));
      expect(screen.getByText(item.clue)).toBeTruthy();
      fireEvent.click(screen.getByTestId('guide-tense-next'));
    }
    expect(screen.getByTestId('guide-tense-done')).toBeTruthy();
  });

  it('stuck: questions 3–5 walk through the alternative; 1–2 are shorter', () => {
    inRouter(<StuckWalkthrough />);
    for (let i = 1; i < STUCK_STEPS.later.length; i++) fireEvent.click(screen.getByTestId('guide-stuck-next'));
    expect(screen.getByText(STUCK_STEPS.later[1])).toBeTruthy();
    expect(screen.queryByTestId('guide-stuck-next')).toBeNull();
    fireEvent.click(screen.getByText('Questions 1–2'));
    fireEvent.click(screen.getByTestId('guide-stuck-next'));
    expect(screen.getByText(STUCK_STEPS.early[1])).toBeTruthy();
    expect(screen.queryByTestId('guide-stuck-next')).toBeNull();
  });

  it('mode picker recommends a place and goes there', () => {
    inRouter(<ModePicker />);
    const goal = MODE_GOALS.find((g) => g.path === '/learn')!;
    fireEvent.click(screen.getByTestId(`guide-goal-${goal.id}`));
    expect(screen.getByTestId('guide-mode-pick').textContent).toMatch(goal.pick);
    fireEvent.click(screen.getByText(goal.action));
    expect(screen.getByText('Learn screen')).toBeTruthy();
  });
});
