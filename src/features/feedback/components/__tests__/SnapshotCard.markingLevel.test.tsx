// @vitest-environment jsdom
// learn-marking §8.2/§8.3 — the per-answer score at the learner's marking level.
import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { SnapshotCard } from '../SnapshotCard';
import fixture from '../../../../domain/learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import type { FeedbackV2 } from '../../../../types';
import type { LevelCheck } from '../../../../domain/learn/marking/markingLevel';

afterEach(cleanup);

const BASE: FeedbackV2 = {
  scores: { overall: 6.8, communication: 8, language: 8, accuracy: 10, fluency: 1 },
  grammar: { critical: [], polish: [] },
  vocabulary: [], style: [], fillers: [], wordCount: 30, cefrLevel: 'A1',
};
const LADDER: FeedbackV2 = { ...BASE, levelCheck: fixture.response.levelCheck as LevelCheck, markingVersion: 'ladder-v1' };

const UNAVAILABLE = 'Level marking unavailable — marked at Exam standard';

describe('SnapshotCard marking level', () => {
  it('shows the score at the chosen level', () => {
    render(<SnapshotCard feedback={LADDER} variant="line" markingLevel="B2" />);
    expect(screen.getByText('4.0')).toBeTruthy();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });

  it('relabels the Full report grid on a ladder reply and reads that level', () => {
    render(<SnapshotCard feedback={LADDER} markingLevel="A1" />);
    expect(screen.getByText('8.8')).toBeTruthy();
    for (const label of ['Answering', 'Range', 'Accuracy', 'Linking']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText('Fluency')).toBeNull();
  });

  it('without levelCheck shows the Exam score with the unavailable note', () => {
    render(<SnapshotCard feedback={BASE} variant="line" markingLevel="B1" />);
    expect(screen.getByText('6.8')).toBeTruthy();
    expect(screen.getByText(UNAVAILABLE)).toBeTruthy();
  });

  it('with the flag off (no level passed) is unchanged: Exam score, old labels, no note', () => {
    render(<SnapshotCard feedback={BASE} />);
    expect(screen.getByText('6.8')).toBeTruthy();
    expect(screen.getByText('Fluency')).toBeTruthy();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });
});
