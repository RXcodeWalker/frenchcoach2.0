// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Question } from '../../../types';
import { QuestionCard } from '../QuestionCard';

vi.mock('../../../services/tts/ttsService', () => ({ TTS: { speak: vi.fn(), stop: vi.fn() } }));

afterEach(cleanup);

const BASE: Question = {
  id: 'sch_02',
  topicKey: 'school',
  text: 'Quelles sont tes matières préférées et pourquoi ?',
  hint: 'Describe 2-3 favourite subjects, give reasons, compare with subjects you dislike.',
  difficulty: 1,
  followUps: [],
  modelAnswer: '',
  keyVocab: [],
};

const renderCard = (question: Question) =>
  render(<QuestionCard question={question} showHint onToggleHint={() => {}} />);

describe('QuestionCard hint', () => {
  it('falls back to the legacy hint string when there is no coachHint', () => {
    renderCard(BASE);
    expect(screen.getByText(/Describe 2-3 favourite subjects/)).toBeTruthy();
    expect(screen.queryByTestId('coach-hint')).toBeNull();
  });

  it('shows coachHint ideas and the phrase frame instead of the legacy hint', () => {
    renderCard({
      ...BASE,
      coachHint: {
        ideas: ["name 2 subjects and one you don't like", "say what the lessons are like"],
        phrase: { fr: "Ce que j'aime le plus, c'est… parce que…", en: 'What I like most is… because…' },
      },
    });
    expect(screen.getByTestId('coach-hint')).toBeTruthy();
    expect(screen.getByText("name 2 subjects and one you don't like")).toBeTruthy();
    expect(screen.getByText(/Ce que j'aime le plus/)).toBeTruthy();
    expect(screen.queryByText(/Describe 2-3 favourite subjects/)).toBeNull();
  });
});
