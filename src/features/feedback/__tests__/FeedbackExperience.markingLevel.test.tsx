// @vitest-environment jsdom
//
// learn-marking §6.1 on the feedback screen: the needs card is in the Coach
// conversation only while Learn passes a marking level, and it follows that level.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const recorder = { isRecording: false, sttSupported: true, start: vi.fn(), stop: vi.fn(async () => '') };
vi.mock('../../recording/useRecording', () => ({ useRecording: () => recorder }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));

import { FeedbackExperience } from '../FeedbackExperience';
import fixture from '../../../domain/learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import type { LevelCheck, MarkingLevel } from '../../../domain/learn/marking/markingLevel';
import type { FeedbackV2 } from '../../../types';

const FEEDBACK = {
  scores: { overall: 7.1, communication: 8, language: 8, accuracy: 10, fluency: 1 },
  grammar: { critical: [], polish: [] },
  vocabulary: [], style: [], fillers: [], wordCount: 30,
  pronunciation: { score: null, issues: [] },
  schemaVersion: 2,
  responseTier: 3,
  best_moment: 'ma mère',
  improved_answer: 'Dans ma famille, il y a quatre personnes.',
  issues: [],
  strengths: [{ quote: 'ma mère', why: 'family word' }],
  levelCheck: fixture.response.levelCheck as LevelCheck,
  markingVersion: 'ladder-v1',
} as unknown as FeedbackV2;

const renderFeedback = (markingLevel?: MarkingLevel) =>
  render(
    <MemoryRouter>
      <FeedbackExperience
        feedback={FEEDBACK}
        transcript="Dans ma famille, il y a quatre personnes. Ma mère est gentille."
        onRetry={vi.fn()}
        onComplete={vi.fn()}
        markingLevel={markingLevel}
      />
    </MemoryRouter>,
  );

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

describe('needs card on the feedback screen', () => {
  it('shows the needs list and the "checked against" caption at the learner\'s level', () => {
    renderFeedback('B1');
    expect(screen.getByRole('heading', { name: 'What your answer needs for B1' })).toBeTruthy();
    expect(screen.getByText('Checked against the B1 ladder')).toBeTruthy();
  });

  it('follows the level', () => {
    renderFeedback('A1');
    expect(screen.getByRole('heading', { name: 'What your answer needs for A1' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'What your answer needs for B1' })).toBeNull();
  });

  it('is absent with the flag off (no marking level passed), even on a ladder reply', () => {
    renderFeedback(undefined);
    expect(screen.queryByText(/What your answer needs for/)).toBeNull();
    expect(screen.queryByText(/Checked against/)).toBeNull();
  });
});
