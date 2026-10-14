// @vitest-environment jsdom
// The Junior Whisper path in a real mission (junior-track §2, Batch 4): which turns go to Whisper,
// what its reading decides, and that a failed Whisper call falls back to Web Speech.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { JUNIOR_BANK } from '../../../data/junior';
import { renderSentence } from '../../../data/junior/sentence';
import { emptyJuniorState, type JuniorState } from '../../../domain/junior/state';

const app = { state: { junior: emptyJuniorState(), learnerTrack: 'junior' } as { junior: JuniorState; learnerTrack: string }, dispatch: vi.fn() };
vi.mock('../../../context/AppContext', () => ({ useApp: () => app }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'granted' }) }));

type Result = { transcript: string; peak: number; blob: Blob | null; webSpeechSupported: boolean; endedBy: 'tap' | 'silence' | 'limit' };
type Cb = (r: Result) => void;
type Read = (r: Result) => Promise<string>;
const cap = { onResult: null as Cb | null, read: undefined as Read | undefined, listening: false, busy: false, toggle: vi.fn(), cancel: vi.fn() };
vi.mock('../../../features/junior/useJuniorCapture', () => ({
  useJuniorCapture: (_blocked: boolean, onResult: Cb, read?: Read) => {
    cap.onResult = onResult;
    cap.read = read;
    return cap;
  },
}));

const whisper = { reply: null as string | null, calls: [] as (Blob | null)[] };
vi.mock('../../../features/junior/juniorTranscription', () => ({
  transcribeJuniorTurn: async (audio: Blob | null) => {
    whisper.calls.push(audio);
    return whisper.reply;
  },
}));

import { MissionPlayer } from '../MissionPlayer';

const blob = new Blob(['x'], { type: 'audio/webm' });
const recorded = () => app.dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === 'RECORD_JUNIOR_TURN');
const turnKind = () => screen.getByTestId('mission-player').getAttribute('data-turn');

/** What the real capture hook does: the read step first (while busy), then the result. */
async function say(transcript: string, { peak = 0.5, webSpeechSupported = true } = {}) {
  await act(async () => {
    const r: Result = { transcript, peak, blob, webSpeechSupported, endedBy: 'tap' };
    const final = cap.read ? await cap.read(r) : transcript;
    cap.onResult!({ ...r, transcript: final });
  });
}
const next = async () => {
  fireEvent.click(screen.getByTestId('mission-next'));
  await act(async () => {});
};

function view() {
  return render(
    <MemoryRouter initialEntries={['/junior/couleurs']}>
      <Routes>
        <Route path="/junior/:themeId" element={<MissionPlayer />} />
        <Route path="/junior" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function pickAll(): Promise<string> {
  const id = screen.getByTestId('mission-player').getAttribute('data-question-id')!;
  const q = JUNIOR_BANK.questions.find((x) => x.id === id)!;
  await act(async () => {
    screen.getAllByTestId('question-frame').forEach((f, i) => {
      const first = q.frames[i].slotOptions[0];
      fireEvent.click(within(f).getAllByTestId('picture-choice').find((b) => b.getAttribute('data-option-id') === first.id)!);
    });
  });
  await act(async () => {});
  return q.frames.map((f) => renderSentence(f.template, f.slotOptions[0])).join(' ');
}

beforeEach(() => {
  app.dispatch.mockReset();
  app.state = { junior: { ...emptyJuniorState(), demoSeen: true }, learnerTrack: 'junior' };
  whisper.reply = null;
  whisper.calls = [];
});
afterEach(cleanup);

describe('MissionPlayer — the Whisper path', () => {
  it('a warm-up with sound but no words switches the mission to Whisper, and Whisper reads the question turns', async () => {
    view();
    expect(turnKind()).toBe('warmup');
    await say('');
    expect(whisper.calls).toHaveLength(0); // the warm-up itself is never sent
    await next();
    const correct = await pickAll();
    whisper.reply = correct;
    await say('quelque chose');
    expect(whisper.calls).toEqual([blob]);
    expect(recorded()[0].turn.outcome).toBe('got');
  });

  it('with Web Speech working, a turn it heard is never sent to Whisper', async () => {
    view();
    await say('bonjour léo');
    await next();
    const correct = await pickAll();
    await say(correct);
    expect(whisper.calls).toHaveLength(0);
    expect(recorded()[0].turn.outcome).toBe('got');
  });

  it('a turn Web Speech returned nothing for (mic heard sound) goes to Whisper', async () => {
    view();
    await say('bonjour léo');
    await next();
    const correct = await pickAll();
    whisper.reply = correct;
    await say('');
    expect(whisper.calls).toHaveLength(1);
    expect(recorded()[0].turn.outcome).toBe('got');
  });

  it('without Web Speech (iPad Safari) every spoken question turn goes to Whisper', async () => {
    view();
    await say('', { webSpeechSupported: false });
    await next();
    const correct = await pickAll();
    whisper.reply = correct;
    await say('', { webSpeechSupported: false });
    expect(whisper.calls).toHaveLength(1);
    expect(recorded()[0].turn.outcome).toBe('got');
  });

  it('a silent try is never sent: it is re-asked as before', async () => {
    view();
    await say('bonjour léo');
    await next();
    await pickAll();
    await say('', { peak: 0 });
    expect(whisper.calls).toHaveLength(0);
    expect(recorded()).toHaveLength(0);
  });

  it('when Whisper gives nothing, the Web Speech transcript decides, and a miss stays honest', async () => {
    view();
    await say('');
    await next();
    const correct = await pickAll();
    whisper.reply = null;
    await say(correct);
    expect(whisper.calls).toHaveLength(1);
    expect(recorded()[0].turn.outcome).toBe('got');
  });

  it('« Et toi ? » is never sent to Whisper', async () => {
    view();
    await say('');
    await next();
    while (turnKind() === 'question') {
      await pickAll();
      await say('', { peak: 0.5 });
      if (!screen.queryByTestId('mission-next')) await say('', { peak: 0.5 });
      await next();
    }
    expect(turnKind()).toBe('etToi');
    const before = whisper.calls.length;
    await say('');
    expect(whisper.calls).toHaveLength(before);
  });
});
