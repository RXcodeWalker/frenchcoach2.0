// @vitest-environment jsdom
// The Junior mission on one screen (junior-track §1–§10): what it records, what it never records,
// and that it can never stall.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { JUNIOR_BANK } from '../../../data/junior';
import { renderSentence } from '../../../data/junior/sentence';
import { emptyJuniorState, type JuniorState } from '../../../domain/junior/state';

const app = { state: { junior: emptyJuniorState(), learnerTrack: 'junior' } as { junior: JuniorState; learnerTrack: string }, dispatch: vi.fn() };
vi.mock('../../../context/AppContext', () => ({ useApp: () => app }));
const auth = { consentStatus: 'granted' as string };
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

type Cb = (r: { transcript: string; peak: number; blob: Blob | null; endedBy: 'tap' | 'silence' | 'limit' }) => void;
const cap = { onResult: null as Cb | null, listening: false, busy: false, toggle: vi.fn(), cancel: vi.fn() };
vi.mock('../../../features/junior/useJuniorCapture', () => ({
  useJuniorCapture: (_blocked: boolean, onResult: Cb) => {
    cap.onResult = onResult;
    return cap;
  },
}));

import { MissionPlayer } from '../MissionPlayer';

const actions = (type: string) => app.dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === type);

async function say(transcript: string, peak = 0.5) {
  await act(async () => {
    cap.onResult!({ transcript, peak, blob: null, endedBy: 'tap' });
  });
}
const next = async () => {
  fireEvent.click(screen.getByTestId('mission-next'));
  await act(async () => {});
};
/** Every Léo line currently on screen (the question's own, plus his reaction). */
const lines = () => screen.getAllByTestId('leo-line').map((l) => l.textContent).join(' | ');
const turnKind = () => screen.getByTestId('mission-player').getAttribute('data-turn');

function view(themeId = 'couleurs') {
  return render(
    <MemoryRouter initialEntries={[`/junior/${themeId}`]}>
      <Routes>
        <Route path="/junior/:themeId" element={<MissionPlayer />} />
        <Route path="/junior" element={<div data-testid="junior-home-stub" />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Picks the first picture of every frame (echo/frame step) and returns what a correct answer sounds like. */
async function pickAll() {
  const id = screen.getByTestId('mission-player').getAttribute('data-question-id')!;
  const q = JUNIOR_BANK.questions.find((x) => x.id === id)!;
  const frames = screen.getAllByTestId('question-frame');
  await act(async () => {
    frames.forEach((f, i) => {
      const first = q.frames[i].slotOptions[0];
      fireEvent.click(within(f).getAllByTestId('picture-choice').find((b) => b.getAttribute('data-option-id') === first.id)!);
    });
  });
  await act(async () => {});
  return q.frames.map((f) => renderSentence(f.template, f.slotOptions[0])).join(' ');
}

async function warmUp() {
  expect(turnKind()).toBe('warmup');
  await say('bonjour léo');
  await next();
}

/** Plays every question turn the same way and « Et toi ? », returning how many question turns there were. */
async function playMission(answer: 'got' | 'none') {
  await warmUp();
  let questions = 0;
  while (turnKind() === 'question') {
    questions += 1;
    const correct = await pickAll();
    if (answer === 'got') {
      await say(correct);
    } else {
      await say('');
      await say('');
    }
    await next();
  }
  expect(turnKind()).toBe('etToi');
  await say('et toi');
  await next();
  return questions;
}

beforeEach(() => {
  app.dispatch.mockReset();
  app.state = { junior: { ...emptyJuniorState(), demoSeen: true }, learnerTrack: 'junior' };
  auth.consentStatus = 'granted';
  cap.listening = false;
  cap.busy = false;
});
afterEach(cleanup);

describe('MissionPlayer — what is recorded', () => {
  it('records each QUESTION turn once, and never the warm-up or « Et toi ? »', async () => {
    view();
    const questions = await playMission('got');
    const recorded = actions('RECORD_JUNIOR_TURN');
    expect(questions).toBeGreaterThanOrEqual(4);
    expect(recorded).toHaveLength(questions);
    expect(recorded.every((a) => a.turn.outcome === 'got')).toBe(true);
    // Turn ids are question ids — the warm-up and « Et toi ? » have none.
    const ids = recorded.map((a) => a.turn.turnId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id: string) => JUNIOR_BANK.questions.some((q) => q.id === id))).toBe(true);
  });

  it('starts the mission in the reducer and finishes it exactly once', async () => {
    view();
    await playMission('got');
    expect(actions('START_JUNIOR_MISSION')).toHaveLength(1);
    expect(actions('FINISH_JUNIOR_MISSION')).toHaveLength(1);
    expect(screen.getByTestId('postcard')).toBeTruthy();
  });

  it('a turn that gets two "none" results moves on and is recorded as "none", never upgraded', async () => {
    view();
    await warmUp();
    await pickAll();
    await say('');
    // First "none": Léo looks curious and the kid gets one more go.
    expect(screen.getByTestId('leo').getAttribute('data-state')).toBe('curious');
    expect(screen.queryByTestId('mission-next')).toBeNull();
    await say('');
    expect(screen.getByTestId('mission-next')).toBeTruthy();
    expect(lines()).toContain('On le dit ensemble');
    expect(actions('RECORD_JUNIOR_TURN')).toHaveLength(1);
    expect(actions('RECORD_JUNIOR_TURN')[0].turn.outcome).toBe('none');
  });

  it('silence (no audio) is asked again and never recorded', async () => {
    view();
    await warmUp();
    await pickAll();
    await say('', 0);
    expect(lines()).toContain('Encore');
    await say('', 0);
    expect(screen.getByTestId('junior-hint').textContent).toContain('Check your mic');
    expect(actions('RECORD_JUNIOR_TURN')).toHaveLength(0);
    expect(screen.queryByTestId('mission-next')).toBeNull();
  });

  it('an "almost" answer gets Léo saying the sentence and one repeat, recorded as "almost" whatever the repeat is', async () => {
    view();
    await warmUp();
    const correct = await pickAll();
    const q = JUNIOR_BANK.questions.find((x) => x.id === screen.getByTestId('mission-player').getAttribute('data-question-id'))!;
    // Only the picked word, none of the pattern's own words (« j'aime », « c'est »…): some key words, not all.
    await say(q.frames[0].slotOptions[0].word);
    expect(actions('RECORD_JUNIOR_TURN')).toHaveLength(0);
    await say(correct);
    expect(actions('RECORD_JUNIOR_TURN')).toHaveLength(1);
    expect(actions('RECORD_JUNIOR_TURN')[0].turn.outcome).toBe('almost');
  });

  it('writes nothing outside the Junior actions: no Session, XP, mastery or analytics', async () => {
    view();
    await playMission('got');
    const allowed = new Set(['START_JUNIOR_MISSION', 'RECORD_JUNIOR_TURN', 'FINISH_JUNIOR_MISSION', 'MARK_JUNIOR_DEMO_SEEN']);
    expect(app.dispatch.mock.calls.map((c) => c[0].type).filter((t) => !allowed.has(t))).toEqual([]);
  });
});

describe('MissionPlayer — stickers reward finishing, never accuracy', () => {
  it('an all-"none" mission finishes with the same sticker payload as an all-"got it" one', async () => {
    view();
    await playMission('got');
    const got = actions('FINISH_JUNIOR_MISSION')[0];
    cleanup();
    app.dispatch.mockReset();
    view();
    await playMission('none');
    const none = actions('FINISH_JUNIOR_MISSION')[0];
    expect(none).toEqual(got);
    expect(none.stickerId).toBe(JUNIOR_BANK.themes.find((t) => t.id === 'couleurs')!.stickers[0].id);
    // The all-"none" Postcard is "You finished!", never empty.
    expect(screen.getByTestId('postcard-finished').textContent).toContain('You finished!');
  });

  it('the Postcard is exactly three items and shows the target sentence, never a transcript', async () => {
    view();
    await playMission('got');
    const items = within(screen.getByTestId('postcard')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(screen.getByTestId('postcard-saidGreat').textContent).toContain('You said it great');
    expect(screen.getByTestId('postcard').textContent).not.toMatch(/\d/);
  });

  it('brings the theme unlock with the sticker that completes the set', async () => {
    const theme = JUNIOR_BANK.themes.find((t) => t.id === 'couleurs')!;
    app.state = {
      ...app.state,
      junior: { ...app.state.junior, stickers: { couleurs: theme.stickers.slice(0, 5).map((s) => s.id) }, missionsDone: { couleurs: 5 } },
    };
    view();
    await playMission('none');
    expect(actions('FINISH_JUNIOR_MISSION')[0]).toMatchObject({ stickerId: theme.stickers[5].id, unlockId: theme.unlock.id });
  });
});

describe('MissionPlayer — the scaffold and the screen', () => {
  it('a new pattern starts at Echo: the kid picks first and the sentence fills in', async () => {
    view();
    await warmUp();
    expect(screen.getAllByTestId('question-frame')[0].getAttribute('data-step')).toBe('echo');
    expect(screen.getByTestId('junior-mic').hasAttribute('disabled')).toBe(true);
    await pickAll();
    expect(screen.getByTestId('junior-mic').hasAttribute('disabled')).toBe(false);
    expect(screen.getAllByTestId('sentence-slot')[0].textContent!.trim().length).toBeGreaterThan(0);
  });

  it('the Free step shows pictures without words, hides the frame until Help, and needs no pick', async () => {
    const q = JUNIOR_BANK.questions.filter((x) => x.themeId === 'couleurs' && x.frames.length === 1)[0];
    const patternSteps = Object.fromEntries(JUNIOR_BANK.questions.flatMap((x) => x.frames.map((f) => [f.patternId, 'free' as const])));
    app.state = { ...app.state, junior: { ...app.state.junior, patternSteps } };
    view();
    await warmUp();
    expect(q).toBeTruthy();
    const frame = screen.getAllByTestId('question-frame')[0];
    expect(frame.getAttribute('data-step')).toBe('free');
    expect(screen.queryByTestId('sentence-frame')).toBeNull();
    expect(screen.getByTestId('junior-mic').hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByTestId('mission-help'));
    expect(screen.getAllByTestId('sentence-frame').length).toBeGreaterThan(0);
  });

  it('shows no 🔊 anywhere while Léo has no way to say a line (no recorded file, no French voice)', async () => {
    view();
    await warmUp();
    expect(screen.queryByTestId('leo-line-sound')).toBeNull();
  });

  it('keeps the English helper hidden behind "?"', async () => {
    view();
    await warmUp();
    expect(screen.queryByTestId('leo-line-en')).toBeNull();
    fireEvent.click(screen.getAllByTestId('leo-line-help')[0]);
    expect(screen.getAllByTestId('leo-line-en').length).toBeGreaterThan(0);
  });

  it('puts Léo in the listening state while a capture is live', async () => {
    cap.listening = true;
    view();
    expect(screen.getByTestId('leo').getAttribute('data-state')).toBe('listening');
  });

  it('the warm-up is always accepted, even with a silent mic: one hint, one more try, then on', async () => {
    view();
    await say('', 0);
    expect(screen.getByTestId('junior-hint')).toBeTruthy();
    expect(screen.queryByTestId('mission-next')).toBeNull();
    await say('', 0);
    expect(screen.getByTestId('mission-next')).toBeTruthy();
    expect(actions('RECORD_JUNIOR_TURN')).toHaveLength(0);
  });

  it('under-13 consent pending shows the guardian notice instead of the mic', async () => {
    auth.consentStatus = 'pending';
    view();
    expect(screen.queryByTestId('junior-mic')).toBeNull();
  });

  it('an unknown theme shows a way back, not a crash', () => {
    view('nope');
    expect(screen.getByTestId('mission-error')).toBeTruthy();
  });
});

describe('MissionPlayer — first run and resume', () => {
  it('shows the guided demo before the warm-up on the very first mission, and marks it seen', async () => {
    app.state = { ...app.state, junior: emptyJuniorState() };
    view();
    expect(turnKind()).toBe('demo');
    fireEvent.click(screen.getByTestId('demo-next'));
    fireEvent.click(screen.getByTestId('demo-next'));
    fireEvent.click(screen.getByTestId('demo-next'));
    await act(async () => {});
    expect(actions('MARK_JUNIOR_DEMO_SEEN')).toHaveLength(1);
    expect(turnKind()).toBe('warmup');
  });

  it('resumes from the last finished turn: finished questions are not asked again and the demo is skipped', async () => {
    const theme = 'couleurs';
    const done = JUNIOR_BANK.questions.filter((q) => q.themeId === theme).slice(0, 3).map((q) => q.id);
    app.state = {
      ...app.state,
      junior: {
        ...emptyJuniorState(),
        activeMission: { themeId: theme, startedAt: Date.now() - 60_000, results: done.map((turnId) => ({ turnId, outcome: 'got' as const })) },
      },
    };
    view(theme);
    await warmUp();
    const asked: string[] = [];
    while (turnKind() === 'question') {
      asked.push(screen.getByTestId('mission-player').getAttribute('data-question-id')!);
      const correct = await pickAll();
      await say(correct);
      await next();
    }
    expect(asked.some((id) => done.includes(id))).toBe(false);
    expect(asked).toHaveLength(2);
    expect(actions('RECORD_JUNIOR_TURN')).toHaveLength(2);
  });

  it('an expired mission is not resumed: the mission starts fresh with no message', async () => {
    const theme = 'couleurs';
    app.state = {
      ...app.state,
      junior: {
        ...emptyJuniorState(),
        demoSeen: true,
        activeMission: { themeId: theme, startedAt: Date.now() - 25 * 60 * 60 * 1000, results: [{ turnId: 'col_01', outcome: 'got' as const }] },
      },
    };
    view(theme);
    await warmUp();
    let questions = 0;
    while (turnKind() === 'question') {
      questions += 1;
      const correct = await pickAll();
      await say(correct);
      await next();
    }
    expect(questions).toBeGreaterThanOrEqual(4);
    expect(document.body.textContent).not.toMatch(/lost|expired/i);
  });
});
