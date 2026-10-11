// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const recorder = {
  isRecording: false,
  sttSupported: true,
  start: vi.fn(),
  stop: vi.fn(async () => ''),
};
vi.mock('../../../recording/useRecording', () => ({ useRecording: () => recorder }));
const auth = { consentStatus: 'unknown' as 'unknown' | 'pending' };
vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => auth }));
const track = vi.fn();
vi.mock('../../../../services/telemetry/telemetryService', () => ({ track: (...a: unknown[]) => track(...a) }));

import { SecondTake } from '../SecondTake';
import type { FeedbackPointGroup } from '../../components/FeedbackPointList';

const GROUPS: FeedbackPointGroup[] = [
  { heading: 'What you did well', tone: 'good', points: [{ kind: 'claim', claim: 'You said who with.', quote: 'avec mes amis' }] },
  {
    heading: 'Fix these first',
    tone: 'bad',
    points: [
      { kind: 'fix', quote: "j'ai allé", correction: 'je suis allé' },
      { kind: 'fix', quote: 'le maison', correction: 'la maison' },
    ],
  },
];

/** Start, then stop, a take that the recogniser heard as `heard`. The mocked hook reads `recorder` on each render. */
async function take(view: { rerender: (ui: ReactElement) => void }, heard: string, groups = GROUPS) {
  recorder.stop.mockResolvedValueOnce(heard);
  fireEvent.click(screen.getByRole('button', { name: /^Record (my second|another) take$/ }));
  recorder.isRecording = true;
  view.rerender(<SecondTake groups={groups} />);
  fireEvent.click(screen.getByRole('button', { name: 'Stop and check my second take' }));
  await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
  recorder.isRecording = false;
  view.rerender(<SecondTake groups={groups} />);
}

beforeEach(() => {
  recorder.isRecording = false;
  recorder.sttSupported = true;
  recorder.start.mockClear();
  recorder.stop.mockClear();
  auth.consentStatus = 'unknown';
  track.mockClear();
});
afterEach(cleanup);

describe('SecondTake', () => {
  it('reports what was heard: one fixed, one still there, strength kept', async () => {
    const view = render(<SecondTake groups={GROUPS} />);
    await take(view, 'Hier je suis allé voir le maison avec mes amis');
    const rows = [...document.querySelectorAll('[data-state]')].map((el) => [el.getAttribute('data-state'), el.textContent]);
    expect(rows).toEqual([
      ['heard', 'I heard « je suis allé » ✓'],
      ['still', 'Still there: « le maison »'],
      ['kept', 'Kept « avec mes amis » ✓'],
    ]);
  });

  it('a paraphrase is "not in this take" — neutral, never a miss', async () => {
    const view = render(<SecondTake groups={GROUPS} />);
    await take(view, 'hier nous avons visité un musée');
    const states = [...document.querySelectorAll('[data-state]')].map((el) => el.getAttribute('data-state'));
    expect(states).toEqual(['absent', 'absent']);
    expect(document.body.textContent).toContain('not in this take');
  });

  it('an empty take is not a verdict: it just offers another go', async () => {
    const view = render(<SecondTake groups={GROUPS} />);
    await take(view, '   ');
    expect(document.body.textContent).toContain("couldn't hear anything");
    expect(screen.getByRole('button', { name: 'Record another take' })).toBeTruthy();
  });

  it('never says wrong, incorrect, failed or a mark, in any state', async () => {
    for (const heard of ['Hier je suis allé voir le maison', 'hier nous avons visité', '']) {
      const view = render(<SecondTake groups={GROUPS} />);
      await take(view, heard);
      expect(document.body.textContent).not.toMatch(/\b(wrong|incorrect|fail|failed|mistake|score|mark|band|grade|\/10|\/40)\b/i);
      view.unmount();
    }
  });

  it('is offered only when there was at least one fix', () => {
    const { container } = render(<SecondTake groups={[GROUPS[0]]} />);
    expect(container.textContent).toBe('');
  });

  it('shows no record control where speech recognition is unavailable', () => {
    recorder.sttSupported = false;
    render(<SecondTake groups={GROUPS} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('waits for the guardian on a pending account: no recorder at all', () => {
    auth.consentStatus = 'pending';
    render(<SecondTake groups={GROUPS} />);
    expect(screen.queryByRole('button', { name: 'Record my second take' })).toBeNull();
  });

  it('only one microphone at a time: locked while another control records, and reports its own use', () => {
    const onMicActive = vi.fn();
    const { rerender } = render(<SecondTake groups={GROUPS} micLocked onMicActive={onMicActive} />);
    expect((screen.getByRole('button', { name: 'Record my second take' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<SecondTake groups={GROUPS} onMicActive={onMicActive} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record my second take' }));
    expect(onMicActive).toHaveBeenCalledWith(true);
    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it('writes nothing and calls no service: no storage, analytics or network', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const view = render(<SecondTake groups={GROUPS} />);
    await take(view, 'Hier je suis allé voir la maison');
    expect(setItem).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    setItem.mockRestore();
    vi.unstubAllGlobals();
  });

  it('cannot reach evidence, sessions, XP, mastery, the review pool or analytics (no such import, no dispatch)', () => {
    const source = readFileSync(`${process.cwd()}/src/features/feedback/teacher/SecondTake.tsx`, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '') // the header comment says what it does not do
      .replace(/^\s*\/\/.*$/gm, '');
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(imports.filter((i) => /context\/AppContext|services\/|storage|telemetry|orchestr|domain\/xp|beliefs/i.test(i))).toEqual([]);
    expect(source).not.toMatch(/dispatch|useApp|track\(/);
  });
});
