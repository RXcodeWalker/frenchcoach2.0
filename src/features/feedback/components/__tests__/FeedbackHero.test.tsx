// @vitest-environment jsdom
// The feedback hero: the score shown once, above both tabs. learn-marking
// §8.2/§8.3 — the per-answer score at the learner's marking level (these cases
// moved here from the old SnapshotCard when the hero replaced it).
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { FeedbackHero, type FeedbackTally } from '../FeedbackHero';
import fixture from '../../../../domain/learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import type { FeedbackV2 } from '../../../../types';
import type { LevelCheck } from '../../../../domain/learn/marking/markingLevel';

afterEach(cleanup);
// Reduced motion: the score is simply there (with motion it counts up from 0).
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});

const BASE: FeedbackV2 = {
  scores: { overall: 6.8, communication: 8, language: 8, accuracy: 10, fluency: 1 },
  grammar: { critical: [], polish: [] },
  vocabulary: [], style: [], fillers: [], wordCount: 30, cefrLevel: 'A1',
};
const LADDER: FeedbackV2 = { ...BASE, levelCheck: fixture.response.levelCheck as LevelCheck, markingVersion: 'ladder-v1' };
const TALLY: FeedbackTally = { strengths: 2, fixes: 3, selfCorrections: 0 };

const UNAVAILABLE = 'Level marking unavailable — marked at Exam standard';
const overall = () => screen.getByTestId('hero-overall').textContent;

describe('FeedbackHero marking level', () => {
  it('shows the score at the chosen level', () => {
    render(<FeedbackHero feedback={LADDER} markingLevel="B2" tally={TALLY} />);
    expect(overall()).toBe('4.0');
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });

  it('relabels the grid on a ladder reply and reads that level', () => {
    render(<FeedbackHero feedback={LADDER} markingLevel="A1" tally={TALLY} />);
    expect(overall()).toBe('8.8');
    for (const label of ['Answering', 'Range', 'Accuracy', 'Linking']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText('Fluency')).toBeNull();
  });

  it('without levelCheck shows the Exam score with the unavailable note', () => {
    render(<FeedbackHero feedback={BASE} markingLevel="B1" tally={TALLY} />);
    expect(overall()).toBe('6.8');
    expect(screen.getByText(UNAVAILABLE)).toBeTruthy();
  });

  it('with the flag off (no level passed): Exam score, the area labels written out, no note', () => {
    render(<FeedbackHero feedback={BASE} tally={TALLY} />);
    expect(overall()).toBe('6.8');
    expect(screen.getByText('Communication')).toBeTruthy();
    expect(screen.getByText('Fluency')).toBeTruthy();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });

  it('says which ladder the score was checked against (§8.3)', () => {
    const { unmount } = render(<FeedbackHero feedback={LADDER} markingLevel="B1" tally={TALLY} />);
    expect(screen.getByText('Checked against the B1 ladder')).toBeTruthy();
    unmount();
    render(<FeedbackHero feedback={LADDER} markingLevel="exam" tally={TALLY} />);
    expect(screen.getByText('Checked against Exam standard')).toBeTruthy();
  });

  it('adds no caption with the flag off, and no "checked against" without a levelCheck', () => {
    const { unmount } = render(<FeedbackHero feedback={LADDER} tally={TALLY} />);
    expect(screen.queryByText(/Checked against/)).toBeNull();
    unmount();
    render(<FeedbackHero feedback={BASE} markingLevel="B1" tally={TALLY} />);
    expect(screen.queryByText(/Checked against/)).toBeNull();
  });

  it('an ungraded (offline) attempt shows no score, and says no level was applied', () => {
    render(<FeedbackHero feedback={{ ...LADDER, unscored: 'no_llm_offline' }} markingLevel="B1" tally={TALLY} />);
    expect(screen.queryByTestId('hero-overall')).toBeNull();
    expect(screen.getByText('Practised offline — not graded')).toBeTruthy();
    expect(screen.getByText('Not graded, so your marking level was not applied.')).toBeTruthy();
  });
});

describe('FeedbackHero tally', () => {
  it('counts what the feedback found, and says so plainly when there is nothing to fix', () => {
    const { unmount } = render(<FeedbackHero feedback={BASE} tally={{ strengths: 1, fixes: 0, selfCorrections: 2 }} />);
    expect(screen.getByText('1 strength')).toBeTruthy();
    expect(screen.getByText('No fixes needed')).toBeTruthy();
    expect(screen.getByText('2 fixed yourself')).toBeTruthy();
    unmount();
    render(<FeedbackHero feedback={BASE} tally={{ strengths: 0, fixes: 1, selfCorrections: 0 }} />);
    expect(screen.getByText('1 fix')).toBeTruthy();
    expect(screen.queryByText(/strength/)).toBeNull();
  });
});
