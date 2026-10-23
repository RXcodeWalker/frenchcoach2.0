// @vitest-environment jsdom
// learn-marking §6.1 — "What your answer needs for <level>".
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LevelNeedsCard } from '../LevelNeedsCard';
import fixture from '../../../../domain/learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import type { FeedbackV2 } from '../../../../types';
import type { LevelCheck } from '../../../../domain/learn/marking/markingLevel';

afterEach(cleanup);

const LEVEL_CHECK = fixture.response.levelCheck as LevelCheck;
const BASE: FeedbackV2 = {
  scores: { overall: 6.8, communication: 8, language: 8, accuracy: 10, fluency: 1 },
  grammar: { critical: [], polish: [] },
  vocabulary: [], style: [], fillers: [], wordCount: 30, cefrLevel: 'A1',
};
const LADDER: FeedbackV2 = { ...BASE, levelCheck: LEVEL_CHECK, markingVersion: 'ladder-v1' };

describe('LevelNeedsCard', () => {
  it('lists what the answer needs at the chosen level, with examples and the first-step tag', () => {
    render(<LevelNeedsCard feedback={LADDER} markingLevel="B1" />);
    expect(screen.getByRole('heading', { name: 'What your answer needs for B1' })).toBeTruthy();
    expect(screen.getByText('Developing your answer')).toBeTruthy();
    expect(screen.getByText('Linking your ideas')).toBeTruthy();
    expect(screen.getByText('Range of language')).toBeTruthy();
    expect(screen.getAllByText('First step')).toHaveLength(1);
    expect(screen.getByText('Mon père est grand, il travaille comme ingénieur.')).toBeTruthy();
  });

  it('is a different list at a different level', () => {
    render(<LevelNeedsCard feedback={LADDER} markingLevel="A1" />);
    expect(screen.getByRole('heading', { name: 'What your answer needs for A1' })).toBeTruthy();
    expect(screen.queryByText('Developing your answer')).toBeNull();
    expect(screen.getByText('Linking your ideas')).toBeTruthy();
  });

  it('explains Exam standard on the exam level, and not elsewhere', () => {
    const { unmount } = render(<LevelNeedsCard feedback={LADDER} markingLevel="exam" />);
    expect(screen.getByRole('heading', { name: 'What your answer needs for Exam standard' })).toBeTruthy();
    expect(screen.getByText(/not a Cambridge mark/)).toBeTruthy();
    unmount();
    render(<LevelNeedsCard feedback={LADDER} markingLevel="B1" />);
    expect(screen.queryByText(/not a Cambridge mark/)).toBeNull();
  });

  it('says the answer meets the level when nothing is missing', () => {
    const met: FeedbackV2 = {
      ...LADDER,
      levelCheck: { ...LEVEL_CHECK, needsByLevel: { ...LEVEL_CHECK.needsByLevel, A2: [] } },
    };
    render(<LevelNeedsCard feedback={met} markingLevel="A2" />);
    expect(screen.getByText('This answer meets A2')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('renders nothing without a levelCheck or for an ungraded attempt', () => {
    const { container, rerender } = render(<LevelNeedsCard feedback={BASE} markingLevel="B1" />);
    expect(container.textContent).toBe('');
    rerender(<LevelNeedsCard feedback={{ ...LADDER, unscored: 'no_llm_offline' }} markingLevel="B1" />);
    expect(container.textContent).toBe('');
  });
});
