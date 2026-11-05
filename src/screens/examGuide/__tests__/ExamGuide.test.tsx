// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CHAPTERS, QUIZ, ROLE_PLAY_EXAMPLES } from '../../../features/examGuide/guideContent';

const trackMock = vi.hoisted(() => vi.fn());

vi.mock('../../../components/TopContextBar', () => ({
  TopContextBar: ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <header>
      {title}
      <button onClick={onBack}>bar-back</button>
    </header>
  ),
}));
vi.mock('../../../components/layout/shellChrome', () => ({ useShowNavRail: () => {} }));
vi.mock('../../../services/telemetry/telemetryService', () => ({ track: trackMock }));
vi.mock('../../../services/exam/examinerVoice', () => ({
  speakExaminerText: vi.fn().mockResolvedValue(undefined),
  stopExaminerVoice: vi.fn(),
  getExaminerVoiceGeneration: () => 0,
  isExaminerVoiceMuted: () => false,
  hasFrenchVoice: () => true,
}));

import { ExamGuide } from '../ExamGuide';
import { hasSeenExamGuide } from '../../../features/examGuide/guideSeen';

beforeEach(() => {
  localStorage.clear();
  trackMock.mockReset();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

function ExamStub() {
  const state = useLocation().state as { startSim?: boolean } | null;
  return <p>{state?.startSim ? 'Exam Sim intro' : 'Exam chooser'}</p>;
}

function renderGuide(state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/exam/guide', state }]}>
      <Routes>
        <Route path="/exam/guide" element={<ExamGuide />} />
        <Route path="/exam" element={<ExamStub />} />
        <Route path="/learn" element={<p>Learn screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ExamGuide', () => {
  it('opens on chapter 1 and reports the visit once', () => {
    renderGuide();
    expect(screen.getByTestId('guide-chapter-exam')).toBeTruthy();
    expect(trackMock).toHaveBeenCalledWith({ name: 'exam_guide_opened', props: {} });
  });

  it('walks through every chapter with Next and ends on the exam chooser', () => {
    renderGuide();
    for (let i = 1; i < CHAPTERS.length; i++) {
      fireEvent.click(screen.getByTestId('guide-next'));
      expect(screen.getByTestId(`guide-chapter-${CHAPTERS[i].id}`)).toBeTruthy();
    }
    fireEvent.click(screen.getByTestId('guide-finish'));
    expect(screen.getByText('Exam chooser')).toBeTruthy();
  });

  it('marks the guide seen, and shows no first-exam banner when opened from the chooser', () => {
    renderGuide();
    expect(hasSeenExamGuide()).toBe(true);
    expect(screen.queryByTestId('guide-first-sim')).toBeNull();
  });

  it('opened before a first Exam Sim: skipping goes straight to the Exam Sim intro', () => {
    renderGuide({ thenSim: true });
    expect(screen.getByTestId('guide-first-sim')).toBeTruthy();
    fireEvent.click(screen.getByTestId('guide-skip-to-sim'));
    expect(screen.getByText('Exam Sim intro')).toBeTruthy();
  });

  it('opened before a first Exam Sim: the last chapter starts it', () => {
    renderGuide({ thenSim: true });
    fireEvent.click(screen.getByTestId('guide-tab-check'));
    expect(screen.getByTestId('guide-finish').textContent).toMatch('Start Exam Sim');
    fireEvent.click(screen.getByTestId('guide-finish'));
    expect(screen.getByText('Exam Sim intro')).toBeTruthy();
  });

  it('first-time visit: practice exercises are folded until "Try it"', () => {
    renderGuide({ thenSim: true });
    expect(screen.queryByTestId('guide-order')).toBeNull();
    fireEvent.click(screen.getByTestId('guide-practice-open'));
    expect(screen.getByTestId('guide-order')).toBeTruthy();
    fireEvent.click(screen.getByTestId('guide-tab-conversations'));
    expect(screen.getAllByTestId('guide-practice-folded')).toHaveLength(2);
    expect(screen.getByTestId('guide-ladder-answer')).toBeTruthy(); // core lesson stays open
  });

  it('opened from the chooser: practice exercises are open', () => {
    renderGuide();
    expect(screen.queryByTestId('guide-practice-folded')).toBeNull();
  });

  it('jumps straight to a chapter from the chapter list', () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-tab-marks'));
    expect(screen.getByTestId('guide-chapter-marks')).toBeTruthy();
  });

  it('timeline: tapping a part shows what happens in it', () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-part-rolePlay'));
    expect(screen.getByText(/repeated once, word for word/)).toBeTruthy();
  });

  it('band explorer reads the official band for the slider mark', () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-tab-marks'));
    const slider = screen.getByLabelText('Mark');
    fireEvent.change(slider, { target: { value: '14' } });
    expect(screen.getByTestId('guide-band-label').textContent).toMatch(/Very good/);
    expect(screen.getByText(/Frequently develops ideas and opinions/)).toBeTruthy();
    fireEvent.change(slider, { target: { value: '5' } });
    expect(screen.getByTestId('guide-band-label').textContent).toMatch(/Weak/);
  });

  it('role-play marker reveals the mark and counts the matches', () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-tab-rolePlay'));
    for (const ex of ROLE_PLAY_EXAMPLES) {
      fireEvent.click(screen.getByTestId(`guide-rp-mark-${ex.mark}`));
      expect(screen.getByText(ex.why)).toBeTruthy();
      fireEvent.click(screen.getByTestId('guide-rp-next'));
    }
    expect(screen.getByTestId('guide-rp-done').textContent).toMatch(`${ROLE_PLAY_EXAMPLES.length} of ${ROLE_PLAY_EXAMPLES.length}`);
  });

  it('answer ladder grows the answer step by step', () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-tab-conversations'));
    const before = screen.getByTestId('guide-ladder-answer').textContent ?? '';
    fireEvent.click(screen.getByTestId('guide-ladder-next'));
    const after = screen.getByTestId('guide-ladder-answer').textContent ?? '';
    expect(after.length).toBeGreaterThan(before.length);
  });

  it('quiz explains each answer and reports a counts-only result at the end', () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-tab-check'));
    for (const q of QUIZ) fireEvent.click(screen.getByTestId(`guide-quiz-${q.id}-${q.answer}`));
    expect(screen.getByTestId('guide-quiz-result').textContent).toMatch(`${QUIZ.length} of ${QUIZ.length}`);
    expect(trackMock).toHaveBeenCalledWith({ name: 'exam_guide_quiz_done', props: { correct: QUIZ.length, total: QUIZ.length } });
  });

  it('phrases: test-yourself hides the French until revealed', () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-tab-conversations'));
    expect(screen.queryAllByTestId('guide-phrase-reveal')).toHaveLength(0);
    fireEvent.click(screen.getByTestId('guide-phrase-mode-test'));
    const hidden = screen.getAllByTestId('guide-phrase-reveal');
    expect(hidden.length).toBeGreaterThan(0);
    fireEvent.click(hidden[0]);
    expect(screen.getAllByTestId('guide-phrase-reveal')).toHaveLength(hidden.length - 1);
  });

  it('every chapter carries its practice exercise', () => {
    renderGuide();
    const expected: Record<string, string> = {
      exam: 'guide-order', marks: 'guide-sort', rolePlay: 'guide-fit', conversations: 'guide-tense', app: 'guide-mode-picker',
    };
    for (const [tab, id] of Object.entries(expected)) {
      fireEvent.click(screen.getByTestId(`guide-tab-${tab}`));
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });

  it('the plan links into the app', () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-tab-app'));
    fireEvent.click(screen.getByText('Open Learn'));
    expect(screen.getByText('Learn screen')).toBeTruthy();
  });
});
