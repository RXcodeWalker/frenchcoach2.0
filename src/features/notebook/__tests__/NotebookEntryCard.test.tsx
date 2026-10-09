// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../recording/useRecording', () => ({
  useRecording: () => ({ isRecording: false, sttSupported: true, start: vi.fn(), stop: vi.fn(async () => '') }),
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
const speak = vi.fn(async () => undefined);
vi.mock('../../../services/tts/ttsService', () => ({
  TTS: {
    isSupported: () => true,
    ensureVoiceReady: async () => undefined,
    hasFrenchVoice: () => true,
    speak: (...a: unknown[]) => speak(...(a as [])),
    stop: vi.fn(),
  },
}));

import { NotebookEntryCard } from '../NotebookEntryCard';
import type { NotebookEntry } from '../../../domain/learn/notebook/notebook';

const ENTRY: NotebookEntry = {
  questionId: 'q1',
  question: 'Que fais-tu le week-end ?',
  topicKey: 'hobbies',
  subTopic: 'weekends',
  answer: 'Je suis allé au cinéma avec mes amis.',
  phrases: ['je suis allé'],
  savedAt: '2026-10-09T10:00:00Z',
  history: [{ answer: 'Je vais au ciné.', phrases: [], savedAt: '2026-10-01T10:00:00Z' }],
};

afterEach(cleanup);

describe('NotebookEntryCard', () => {
  it('shows the question and the saved answer, and reads the answer aloud in French on request', async () => {
    render(<NotebookEntryCard entry={ENTRY} />);
    expect(screen.getByText('Que fais-tu le week-end ?')).toBeTruthy();
    expect(screen.getByText('Je suis allé au cinéma avec mes amis.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Listen to this answer' }));
    await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('Je suis allé au cinéma avec mes amis.'));
  });

  it('Recall mode blanks the answer and can be left again', () => {
    render(<NotebookEntryCard entry={ENTRY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Recall mode' }));
    expect(screen.getByTestId('recall-mode')).toBeTruthy();
    expect(screen.queryByText('Je suis allé au cinéma avec mes amis.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the answer' }));
    expect(screen.getByText('Je suis allé au cinéma avec mes amis.')).toBeTruthy();
  });

  it('keeps earlier versions as history', () => {
    render(<NotebookEntryCard entry={ENTRY} />);
    expect(screen.getByText('Earlier versions (1)')).toBeTruthy();
    expect(screen.getByText('Je vais au ciné.')).toBeTruthy();
  });

  it('shows no history section for a first version', () => {
    render(<NotebookEntryCard entry={{ ...ENTRY, history: [] }} />);
    expect(screen.queryByText(/Earlier versions/)).toBeNull();
  });
});
