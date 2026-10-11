// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const app = { state: { notebook: [] as unknown[] } };
vi.mock('../../context/AppContext', () => ({ useApp: () => app }));
const auth = { user: null as null | { id: string } };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../features/recording/useRecording', () => ({
  useRecording: () => ({ isRecording: false, sttSupported: true, start: vi.fn(), stop: vi.fn(async () => '') }),
}));

import { Notebook } from '../Notebook';
import { upsertEntry, type NotebookEntry } from '../../domain/learn/notebook/notebook';

function entries(): NotebookEntry[] {
  let e: NotebookEntry[] = [];
  const base = { question: 'Question ?', answer: 'Je suis allé au cinéma.', phrases: ['je suis allé'] };
  e = upsertEntry(e, { ...base, questionId: 'a', topicKey: 'hobbies', subTopic: 'sport' }, '1');
  e = upsertEntry(e, { ...base, questionId: 'b', topicKey: 'hobbies', subTopic: 'music' }, '2');
  e = upsertEntry(e, { ...base, questionId: 'c', topicKey: 'school' }, '3');
  return e;
}

function view() {
  return render(
    <MemoryRouter>
      <Notebook />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  app.state.notebook = [];
  auth.user = null;
});

describe('Notebook screen', () => {
  it('a guest sees only the sign-in note, even if something were in state', () => {
    app.state.notebook = entries();
    view();
    expect(screen.getByTestId('notebook-signed-out').textContent).toContain('Sign in to keep your notes.');
    expect(screen.queryByTestId('notebook-entry')).toBeNull();
  });

  it('a signed-in learner with nothing saved sees how to save', () => {
    auth.user = { id: 'u1' };
    view();
    expect(screen.getByTestId('notebook-empty').textContent).toContain('Save to notebook');
  });

  it('groups saved answers by topic and sub-topic, framed as material to adapt', () => {
    auth.user = { id: 'u1' };
    app.state.notebook = entries();
    const { container } = view();
    expect(container.textContent).toContain('material to adapt');
    expect(container.textContent).toContain('not a script to memorise');
    expect(screen.getAllByTestId('notebook-entry')).toHaveLength(3);
    const topics = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(topics).toHaveLength(2);
    const hobbies = screen.getAllByRole('region').find((r) => within(r).queryAllByTestId('notebook-entry').length === 2)!;
    const subs = within(hobbies).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(subs).toHaveLength(2);
    // The entry without a sub-topic sits under "Other".
    expect(screen.getByRole('heading', { level: 3, name: 'Other' })).toBeTruthy();
  });
});
