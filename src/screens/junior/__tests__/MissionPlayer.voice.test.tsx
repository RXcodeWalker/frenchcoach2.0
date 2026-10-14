// @vitest-environment jsdom
// Léo's voice in a mission (junior-track §3, §4, §7): he asks aloud, his 🔊 appears only where he can say
// the line, and he stops the moment the learner taps the mic.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { JUNIOR_BANK, WARMUP_PROMPT } from '../../../data/junior';
import { renderSentence } from '../../../data/junior/sentence';
import { emptyJuniorState } from '../../../domain/junior/state';

const app = { state: { junior: { ...emptyJuniorState(), demoSeen: true }, learnerTrack: 'junior' }, dispatch: vi.fn() };
vi.mock('../../../context/AppContext', () => ({ useApp: () => app }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'granted' }) }));

type Cb = (r: { transcript: string; peak: number; blob: Blob | null; endedBy: 'tap' }) => void;
const cap = { onResult: null as Cb | null, listening: false, busy: false, toggle: vi.fn(), cancel: vi.fn() };
vi.mock('../../../features/junior/useJuniorCapture', () => ({
  useJuniorCapture: (_b: boolean, onResult: Cb) => {
    cap.onResult = onResult;
    return cap;
  },
}));

const voice = {
  speakable: new Set<string>(),
  spoken: [] as string[],
  canSpeak: vi.fn((l: { fr: string; audioId: string }) => voice.speakable.has(l.audioId)),
  speak: vi.fn(async (l: { fr: string }) => { voice.spoken.push(l.fr); }),
  speakAll: vi.fn(async (ls: Array<{ fr: string }>) => { voice.spoken.push(...ls.map((l) => l.fr)); }),
  stop: vi.fn(),
};
vi.mock('../../../features/junior/leoVoice', () => ({ useLeoVoice: () => voice }));

import { MissionPlayer } from '../MissionPlayer';

const view = () =>
  render(
    <MemoryRouter initialEntries={['/junior/couleurs']}>
      <Routes><Route path="/junior/:themeId" element={<MissionPlayer />} /></Routes>
    </MemoryRouter>,
  );
const say = async (transcript: string, peak = 0.5) => act(async () => cap.onResult!({ transcript, peak, blob: null, endedBy: 'tap' }));

beforeEach(() => {
  voice.speakable = new Set();
  voice.spoken.length = 0;
  voice.canSpeak.mockClear(); voice.speak.mockClear(); voice.speakAll.mockClear(); voice.stop.mockClear();
  cap.toggle.mockClear();
  cap.listening = false;
  app.dispatch.mockReset();
});
afterEach(cleanup);

describe('MissionPlayer — Léo speaks', () => {
  it('asks the warm-up aloud when the mission starts', async () => {
    view();
    await act(async () => {});
    expect(voice.spoken[0]).toBe(WARMUP_PROMPT.fr);
  });

  it('asks each question aloud when its turn starts', async () => {
    view();
    await say('bonjour léo');
    await act(async () => { fireEvent.click(screen.getByTestId('mission-next')); });
    const q = JUNIOR_BANK.questions.find((x) => x.id === screen.getByTestId('mission-player').getAttribute('data-question-id'))!;
    expect(voice.spoken).toContain(q.prompt.fr);
  });

  it('shows a 🔊 on a line only when Léo can say it', async () => {
    view();
    expect(screen.queryByTestId('leo-line-sound')).toBeNull();
    cleanup();
    voice.speakable = new Set([WARMUP_PROMPT.audioId]);
    view();
    const buttons = screen.getAllByTestId('leo-line-sound');
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(voice.speak).toHaveBeenLastCalledWith(expect.objectContaining({ audioId: WARMUP_PROMPT.audioId }));
  });

  it('tapping the mic stops Léo first, so the mic never hears him', async () => {
    view();
    voice.stop.mockClear();
    fireEvent.click(screen.getByTestId('junior-mic'));
    expect(voice.stop).toHaveBeenCalled();
    expect(cap.toggle).toHaveBeenCalledTimes(1);
    expect(voice.stop.mock.invocationCallOrder[0]).toBeLessThan(cap.toggle.mock.invocationCallOrder[0]);
  });

  it('in the Echo step Léo says the learner’s own chosen sentence before the mic opens', async () => {
    view();
    await say('bonjour léo');
    await act(async () => { fireEvent.click(screen.getByTestId('mission-next')); });
    const q = JUNIOR_BANK.questions.find((x) => x.id === screen.getByTestId('mission-player').getAttribute('data-question-id'))!;
    voice.speakAll.mockClear();
    await act(async () => {
      screen.getAllByTestId('question-frame').forEach((f, i) => {
        const first = q.frames[i].slotOptions[0];
        fireEvent.click(f.querySelector(`[data-option-id="${first.id}"]`)!);
      });
    });
    expect(voice.speakAll).toHaveBeenCalledTimes(1);
    expect(voice.speakAll.mock.calls[0][0].map((l: { fr: string }) => l.fr)).toEqual(q.frames.map((f) => renderSentence(f.template, f.slotOptions[0])));
    expect(screen.getByTestId('junior-mic').hasAttribute('disabled')).toBe(false);
  });

  it('« On le dit ensemble ! » is followed by the model sentence, spoken by Léo', async () => {
    view();
    await say('bonjour léo');
    await act(async () => { fireEvent.click(screen.getByTestId('mission-next')); });
    const q = JUNIOR_BANK.questions.find((x) => x.id === screen.getByTestId('mission-player').getAttribute('data-question-id'))!;
    await act(async () => {
      screen.getAllByTestId('question-frame').forEach((f, i) => fireEvent.click(f.querySelector(`[data-option-id="${q.frames[i].slotOptions[0].id}"]`)!));
    });
    voice.speakAll.mockClear();
    await say('');
    await say('');
    const said = voice.speakAll.mock.calls[voice.speakAll.mock.calls.length - 1][0].map((l: { fr: string }) => l.fr);
    expect(said[0]).toBe('On le dit ensemble !');
    expect(said.slice(1)).toEqual(q.frames.map((f) => renderSentence(f.template, f.slotOptions[0])));
  });
});
