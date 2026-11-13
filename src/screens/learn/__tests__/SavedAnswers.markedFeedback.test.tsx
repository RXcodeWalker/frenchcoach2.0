// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { evaluate } from '../../../services/coaching/coachService';
import { getQuestionById } from '../../../data/gameData';
import type { SavedAnswer } from '../../../services/offline/savedAnswers';

const question = getQuestionById('sch_01')!;
const transcript = 'Mon collège est grand et moderne. J’aime les maths parce que c’est intéressant.';
const marked: SavedAnswer = {
  id: 'saved-1',
  scope: 'guest',
  questionId: question.id,
  topicKey: question.topicKey,
  questionText: question.text,
  audio: new ArrayBuffer(4),
  mimeType: 'audio/webm',
  durationSec: 9,
  recordedAt: '2026-11-05T08:00:00.000Z',
  status: 'marked',
  transcript,
  uploadAttempts: 1,
  marked: { style: 'coach', feedback: evaluate(transcript, question) },
  markedAt: '2026-11-05T18:00:00.000Z',
};

vi.mock('../../../features/learn/savedAnswers/useSavedAnswers', () => ({
  useSavedAnswers: () => ({ items: [marked], loaded: true }),
  useSavedAnswerScope: () => 'guest',
}));
vi.mock('../../../components/TopContextBar', () => ({ TopContextBar: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('../../../pwa/useOnlineStatus', () => ({ useOnlineStatus: () => true, isOnline: () => true }));

import { SavedAnswers } from '../SavedAnswers';

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Saved answers: an answer already marked is read again for free', () => {
  it('shows the stored feedback with no request (so no daily answer is spent)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <MemoryRouter initialEntries={['/learn/saved']}>
        <Routes>
          <Route path="/learn/saved" element={<SavedAnswers />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Get feedback')).toBeNull();
    fireEvent.click(screen.getByTestId('see-feedback'));
    expect(screen.getByTestId('stored-feedback-note').textContent).toContain('Reading it again is free');
    expect(screen.getAllByText(/Get new feedback/).length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('"Get new feedback" is the only way to mark it again — an explicit, charged attempt', () => {
    render(
      <MemoryRouter initialEntries={['/learn/saved']}>
        <Routes>
          <Route path="/learn/saved" element={<SavedAnswers />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('see-feedback'));
    fireEvent.click(screen.getAllByRole('button', { name: /Get new feedback/ })[0]);
    // It is asked first: marking again uses one of today's answers.
    expect(screen.getByTestId('retry-confirm-note').textContent).toContain('daily Learn answers');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, use an answer' }));
    expect(screen.getByTestId('where').textContent).toBe('/learn?saved=saved-1&again=1');
  });
});
