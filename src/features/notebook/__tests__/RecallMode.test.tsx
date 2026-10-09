// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const recorder = { isRecording: false, sttSupported: true, start: vi.fn(), stop: vi.fn(async () => '') };
vi.mock('../../recording/useRecording', () => ({ useRecording: () => recorder }));
const auth = { consentStatus: 'unknown' as 'unknown' | 'pending' };
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

import { RecallMode } from '../RecallMode';

const ENTRY = {
  answer: "Le week-end, je suis allé au cinéma avec mes amis parce que j'adore les films d'action.",
  phrases: ['je suis allé', "j'adore les films d'action"],
};

// `ui` is a factory: React skips a re-render for the very same element, and the mocked recorder is read on render.
async function take(view: { rerender: (ui: ReactElement) => void }, heard: string, ui: () => ReactElement) {
  recorder.stop.mockResolvedValueOnce(heard);
  fireEvent.click(screen.getByRole('button', { name: /^(Say it from memory|Say it again)$/ }));
  recorder.isRecording = true;
  view.rerender(ui());
  fireEvent.click(screen.getByRole('button', { name: 'Stop and check what I said' }));
  await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
  recorder.isRecording = false;
  view.rerender(ui());
}

beforeEach(() => {
  recorder.isRecording = false;
  recorder.sttSupported = true;
  recorder.start.mockClear();
  recorder.stop.mockClear();
  auth.consentStatus = 'unknown';
});
afterEach(cleanup);

describe('RecallMode', () => {
  it('blanks the key phrases and keeps the rest of the answer', () => {
    render(<RecallMode entry={ENTRY} />);
    expect(screen.getAllByTestId('recall-blank')).toHaveLength(2);
    const text = screen.getByTestId('recall-mode').textContent ?? '';
    expect(text).toContain('Le week-end,');
    expect(text).toContain('au cinéma avec mes amis parce que');
    expect(text).not.toContain('je suis allé');
    expect(text).not.toContain("j'adore les films d'action");
  });

  it('reports what was heard; the rest is neutral, never a verdict', async () => {
    const ui = () => <RecallMode entry={ENTRY} />;
    const view = render(ui());
    await take(view, 'le week-end je suis allé au cinéma', ui);
    const rows = [...document.querySelectorAll('[data-state]')].map((el) => [el.getAttribute('data-state'), el.textContent]);
    expect(rows).toEqual([
      ['recalled', 'I heard « je suis allé » ✓'],
      ['not-heard', "« j'adore les films d'action » — not in this take"],
    ]);
    expect(document.body.textContent).not.toMatch(/wrong|incorrect|failed|score|mark/i);
    expect(screen.getByRole('button', { name: 'Say it again' })).toBeTruthy();
  });

  it('an empty take just offers another go', async () => {
    const ui = () => <RecallMode entry={ENTRY} />;
    const view = render(ui());
    await take(view, '   ', ui);
    expect(document.body.textContent).toContain("couldn't hear anything");
    expect(document.querySelectorAll('[data-state]')).toHaveLength(0);
  });

  it('an entry with no usable key phrases says so instead of showing an empty exercise', () => {
    render(<RecallMode entry={{ answer: ENTRY.answer, phrases: [] }} />);
    expect(screen.getByTestId('recall-unavailable')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is locked while another recorder owns the microphone', () => {
    render(<RecallMode entry={ENTRY} micLocked />);
    expect((screen.getByRole('button', { name: 'Say it from memory' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('is hidden where the browser has no speech recognition, and goes through the consent gate', () => {
    recorder.sttSupported = false;
    render(<RecallMode entry={ENTRY} />);
    expect(screen.queryByRole('button')).toBeNull();
    const src = readFileSync(join(process.cwd(), 'src/features/notebook/RecallMode.tsx'), 'utf8');
    expect(src).toMatch(/<SpeakingConsentGate>/);
  });

  it('writes nothing: no storage, context, dispatch or analytics', () => {
    const src = readFileSync(join(process.cwd(), 'src/features/notebook/RecallMode.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/services\/|context\/|dispatch|localStorage|track\(/);
  });
});
