// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PastAttempts, PAST_ATTEMPTS_PAGE } from '../PastAttempts';
import type { PastAttempt } from '../../../features/progress/progressSummary';

afterEach(() => cleanup());

function exam(overrides: Partial<Extract<PastAttempt, { kind: 'exam' }>> = {}): PastAttempt {
  return { kind: 'exam', id: 'e1', date: new Date().toISOString(), counted: true, total: 29, areas: [], ...overrides };
}

function learn(id: string): PastAttempt {
  return {
    kind: 'learn', id, date: new Date().toISOString(), topicLabel: 'School & Education', score: 7.5,
    questionText: 'Tu aimes ton école ?', transcript: 'Oui, j’aime mon école.', feedbackSummary: 'Add a reason.',
  };
}

function renderList(attempts: PastAttempt[]) {
  return render(<MemoryRouter><PastAttempts attempts={attempts} /></MemoryRouter>);
}

describe('PastAttempts', () => {
  it('tags a practiceOnly exam as not counted and a counting one as counted', () => {
    renderList([exam({ id: 'p', counted: false }), exam({ id: 'c' })]);
    expect(screen.getByText('Practice · not counted')).not.toBeNull();
    expect(screen.getByText('Counted in your Exam figures')).not.toBeNull();
    expect(screen.getAllByText('Exam Sim')).toHaveLength(2);
  });

  it('filters by kind with the segmented control', () => {
    renderList([exam({ id: 'e' }), learn('l1'), learn('l2')]);
    expect(screen.getAllByTestId('progress-attempt')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Exam' }));
    expect(screen.getAllByTestId('progress-attempt')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    expect(screen.getAllByTestId('progress-attempt')).toHaveLength(2);
  });

  it('shows exam totals out of 40 and expands to the saved area marks', () => {
    renderList([exam({ areas: [{ key: 'communication', label: 'Communication', mark: 11, max: 15 }] })]);
    expect(screen.getByText('29/40')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('11/15')).not.toBeNull();
  });

  it('expands a Learn answer to its question, transcript and feedback summary', () => {
    renderList([learn('l1')]);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Tu aimes ton école ?')).not.toBeNull();
    expect(screen.getByText(/Add a reason\./)).not.toBeNull();
  });

  it('has a useful empty state that links into Learn and Exam', () => {
    renderList([]);
    expect(screen.getByRole('link', { name: 'Answer a Learn question' }).getAttribute('href')).toBe('/learn');
    expect(screen.getByRole('link', { name: 'sit an Exam Sim' }).getAttribute('href')).toBe('/exam');
  });

  it('pages long histories', () => {
    renderList(Array.from({ length: PAST_ATTEMPTS_PAGE + 3 }, (_, i) => learn(`l${i}`)));
    expect(screen.getAllByTestId('progress-attempt')).toHaveLength(PAST_ATTEMPTS_PAGE);
    fireEvent.click(screen.getByText('Show more (3 older)'));
    expect(screen.getAllByTestId('progress-attempt')).toHaveLength(PAST_ATTEMPTS_PAGE + 3);
  });
});
