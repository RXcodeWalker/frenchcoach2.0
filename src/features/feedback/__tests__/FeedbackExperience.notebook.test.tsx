// @vitest-environment jsdom
//
// Learn feedback Batch 6d on the feedback screen: "Save to notebook" is offered
// once, after a Second take or a high-scoring answer; it waits until the "Say it
// better" rewrite is visible; nothing is written without a tap; a guest cannot
// save; and it is absent when Learn passes no notebook (a follow-up turn).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

const recorder = { isRecording: false, sttSupported: true, start: vi.fn(), stop: vi.fn(async () => '') };
vi.mock('../../recording/useRecording', () => ({ useRecording: () => recorder }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));

import { FeedbackExperience } from '../FeedbackExperience';
import type { FeedbackV2 } from '../../../types';

const TRANSCRIPT = 'Samedi je suis allé au cinéma avec mes amis. Mon mère était contente.';
const FEEDBACK = {
  scores: { overall: 6.5, communication: 7, language: 6, fluency: 6 },
  grammar: { critical: [], polish: [] },
  vocabulary: [], style: [], fillers: [], wordCount: 13,
  pronunciation: { score: null, issues: [] },
  schemaVersion: 2,
  responseTier: 3,
  best_moment: 'avec mes amis',
  improved_answer: 'Samedi, je suis allé au cinéma avec mes amis. Ma mère était contente.',
  issues: [{ id: 'g', category: 'grammar', severity: 'major', quote: 'Mon mère', diagnostic: 'Why g.', correction: 'Ma mère', marksImpact: 3 }],
  strengths: [{ quote: 'avec mes amis', why: 'who with' }],
} as unknown as FeedbackV2;

const QUESTION = { questionId: 'q1', question: 'Que fais-tu le week-end ?', topicKey: 'hobbies' };

function Wrapper(props: Partial<Parameters<typeof FeedbackExperience>[0]>): ReactElement {
  return (
    <MemoryRouter>
      <FeedbackExperience transcript={TRANSCRIPT} onRetry={vi.fn()} onComplete={vi.fn()} feedback={props.feedback ?? FEEDBACK} {...props} />
    </MemoryRouter>
  );
}

function notebook(over: Partial<NonNullable<Parameters<typeof FeedbackExperience>[0]['notebook']>> = {}) {
  return { question: QUESTION, signedIn: true, savedAnswer: null, onSave: vi.fn(), ...over };
}

const showMe = () => screen.getAllByRole('button', { name: 'Just show me' }).forEach((b) => fireEvent.click(b));

beforeEach(() => {
  recorder.isRecording = false;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

describe('Save to notebook on the feedback screen', () => {
  it('a high-scoring answer is offered once the rewrite is visible, and nothing is saved until the tap', () => {
    const nb = notebook();
    render(<Wrapper feedback={{ ...FEEDBACK, scores: { ...FEEDBACK.scores, overall: 8.5 } } as FeedbackV2} notebook={nb} />);
    // The rewrite is still held back behind the "Try it first" nudge, so the offer is too.
    expect(screen.queryByTestId('notebook-offer')).toBeNull();
    showMe();
    expect(screen.getByTestId('notebook-offer')).toBeTruthy();
    expect(nb.onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save to notebook' }));
    expect(nb.onSave).toHaveBeenCalledTimes(1);
    expect(nb.onSave).toHaveBeenCalledWith({
      ...QUESTION,
      answer: FEEDBACK.improved_answer,
      phrases: ['avec mes amis'],
    });
  });

  it('a middling answer shows only the quiet button, never the offer', () => {
    render(<Wrapper notebook={notebook()} />);
    showMe();
    expect(screen.queryByTestId('notebook-offer')).toBeNull();
    expect(screen.getByTestId('notebook-quiet')).toBeTruthy();
  });

  it('a Second take that produced something triggers the offer', async () => {
    const nb = notebook();
    const { rerender } = render(<Wrapper notebook={nb} />);
    showMe();
    expect(screen.queryByTestId('notebook-offer')).toBeNull();
    recorder.stop.mockResolvedValueOnce('Ma mère était contente');
    fireEvent.click(screen.getByRole('button', { name: 'Record my second take' }));
    recorder.isRecording = true;
    rerender(<Wrapper notebook={nb} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop and check my second take' }));
    await waitFor(() => expect(screen.getByTestId('notebook-offer')).toBeTruthy());
    expect(nb.onSave).not.toHaveBeenCalled();
  });

  it('an empty Second take does not trigger the offer', async () => {
    const nb = notebook();
    const { rerender } = render(<Wrapper notebook={nb} />);
    showMe();
    recorder.stop.mockResolvedValueOnce('   ');
    fireEvent.click(screen.getByRole('button', { name: 'Record my second take' }));
    recorder.isRecording = true;
    rerender(<Wrapper notebook={nb} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop and check my second take' }));
    await waitFor(() => expect(screen.getByText(/couldn't hear anything/)).toBeTruthy());
    expect(screen.queryByTestId('notebook-offer')).toBeNull();
  });

  it('a guest gets a sign-in note and no save control', () => {
    const nb = notebook({ signedIn: false });
    render(<Wrapper feedback={{ ...FEEDBACK, scores: { ...FEEDBACK.scores, overall: 9 } } as FeedbackV2} notebook={nb} />);
    showMe();
    expect(screen.getByTestId('notebook-guest').textContent).toContain('Sign in to keep your notes.');
    expect(screen.queryByRole('button', { name: /save to notebook/i })).toBeNull();
  });

  it('no notebook prop (a follow-up turn) renders nothing about it', () => {
    render(<Wrapper notebook={null} feedback={{ ...FEEDBACK, scores: { ...FEEDBACK.scores, overall: 9 } } as FeedbackV2} />);
    showMe();
    expect(screen.queryByTestId('notebook-offer')).toBeNull();
    expect(screen.queryByTestId('notebook-quiet')).toBeNull();
    expect(screen.queryByTestId('notebook-guest')).toBeNull();
  });
});
