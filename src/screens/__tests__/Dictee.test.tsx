// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../components/TopContextBar', () => ({
  TopContextBar: ({ subtitle, onBack, backLabel }: { subtitle?: string; onBack?: () => void; backLabel?: string }) => (
    <header>
      <span data-testid="subtitle">{subtitle}</span>
      <button onClick={onBack}>{backLabel}</button>
    </header>
  ),
}));

// A voice that can say French and is silent: the test reads what it was asked to say.
const voice = vi.hoisted(() => ({ french: true }));
vi.mock('../../services/tts/ttsService', () => ({
  TTS: {
    isSupported: () => true,
    ensureVoiceReady: () => Promise.resolve(),
    hasFrenchVoice: () => voice.french,
    canSpeakFrench: () => voice.french,
    speak: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    isSpeaking: () => false,
    onStateChange: vi.fn(),
  },
}));

import { Dictee } from '../Dictee';
import { TTS } from '../../services/tts/ttsService';
import { DICTEE_ITEMS } from '../../data/dictee';

const speak = TTS.speak as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  voice.french = true;
  speak.mockClear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(() => cleanup());

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/dictee']}>
      <Routes>
        <Route path="/dictee" element={<Dictee />} />
        <Route path="/explore" element={<p>Explore hub</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const flush = () => act(async () => { await Promise.resolve(); });
const click = (el: HTMLElement) => act(() => { fireEvent.click(el); });
const byTestId = (id: string) => screen.getByTestId(id);
const box = () => byTestId('dictee-answer') as HTMLInputElement | HTMLTextAreaElement;
const type = (value: string) => act(() => { fireEvent.change(box(), { target: { value } }); });

/** The line the voice was last asked to say: what the learner is hearing now. */
const heard = () => speak.mock.calls[speak.mock.calls.length - 1][0] as string;

async function start() {
  renderScreen();
  click(byTestId('dictee-start'));
  await flush();
}
/** Answers the current line exactly, then moves on. */
async function answerRight() {
  type(heard());
  click(byTestId('dictee-check'));
  click(byTestId('dictee-next'));
  await flush();
}

describe('Dictée setup', () => {
  it('opens with one primary action, says it earns no XP, and Back returns to Explore', () => {
    renderScreen();
    expect(byTestId('dictee-start').textContent).toContain('Start · 10 words');
    expect(screen.getByText(/doesn't earn XP/)).toBeTruthy();
    click(screen.getByRole('button', { name: 'Back to Explore' }));
    expect(screen.getByText('Explore hub')).toBeTruthy();
  });

  it('lets the learner pick sentences and a level, and remembers it', () => {
    renderScreen();
    click(screen.getByRole('button', { name: /Sentences/ }));
    click(screen.getByRole('button', { name: /Stretch/ }));
    expect(byTestId('dictee-start').textContent).toContain('Start · 6 sentences');
    click(byTestId('dictee-start'));
    expect(JSON.parse(localStorage.getItem('frenchCoach_dictee') ?? '{}').last).toEqual({ format: 'sentences', level: 'B1', focus: 'any' });
  });

  it('offers Sound-alikes for sentences only, and My slips only once there are some', () => {
    renderScreen();
    expect(screen.queryByTestId('dictee-focus-sound-alikes')).toBeNull();
    click(screen.getByRole('button', { name: /Sentences/ }));
    expect(byTestId('dictee-focus-sound-alikes')).toBeTruthy();
    expect(screen.queryByTestId('dictee-focus-slips')).toBeNull();
  });

  it('says so, and will not start, on a device that cannot speak French', async () => {
    voice.french = false;
    renderScreen();
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(byTestId('dictee-no-voice').textContent).toMatch(/can't speak French/);
    expect((byTestId('dictee-start') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('a round', () => {
  it('plays the first line on its own, as recorded French, once', async () => {
    await start();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][1]).toMatchObject({ recorded: true });
    expect(DICTEE_ITEMS.some(i => i.fr === heard())).toBe(true);
    expect(byTestId('dictee-progress').textContent).toBe('Word 1 of 10');
  });

  it('plays it again, and slower, on request', async () => {
    await start();
    click(byTestId('dictee-listen'));
    await flush();
    expect(speak).toHaveBeenCalledTimes(2);
    click(byTestId('dictee-slow'));
    await flush();
    expect(speak).toHaveBeenCalledTimes(3);
    expect(speak.mock.calls[2][1]).toMatchObject({ recorded: true, rate: 0.6 });
    expect(speak.mock.calls[2][0]).toBe(speak.mock.calls[0][0]);
    expect(screen.getByText('Listened 3×')).toBeTruthy();
  });

  it('keeps the meaning hidden until it is asked for', async () => {
    await start();
    expect(screen.queryByTestId('dictee-meaning')).toBeNull();
    click(byTestId('dictee-show-meaning'));
    expect(byTestId('dictee-meaning').textContent?.length).toBeGreaterThan(2);
  });

  it('will not check an empty answer', async () => {
    await start();
    expect((byTestId('dictee-check') as HTMLButtonElement).disabled).toBe(true);
    type('   ');
    expect((byTestId('dictee-check') as HTMLButtonElement).disabled).toBe(true);
  });

  it('marks a right answer perfect, with the points and the sharp-ear bonus, and goes on', async () => {
    await start();
    type(heard().toUpperCase());
    click(byTestId('dictee-check'));
    expect(byTestId('dictee-headline').textContent).toBe('Perfect');
    expect(byTestId('dictee-feedback').getAttribute('data-tone')).toBe('perfect');
    expect(byTestId('dictee-score').textContent).toBe('125');
    expect(screen.getByText(/Sharp ear/)).toBeTruthy();
    expect(byTestId('dictee-correct').textContent).toBe(speak.mock.calls[0][0]);
    click(byTestId('dictee-next'));
    await flush();
    expect(byTestId('dictee-progress').textContent).toBe('Word 2 of 10');
    expect((byTestId('dictee-answer') as HTMLInputElement).value).toBe('');
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('Enter checks the answer', async () => {
    await start();
    type(heard());
    act(() => { fireEvent.keyDown(box(), { key: 'Enter' }); });
    expect(byTestId('dictee-headline').textContent).toBe('Perfect');
  });

  it('names a missing accent as a near miss, and shows the slip word by word', async () => {
    await start();
    const typed = heard().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
    type(typed);
    click(byTestId('dictee-check'));
    // the first line of a round may have no accent at all; then it is simply perfect
    if (typed === heard()) return expect(byTestId('dictee-headline').textContent).toBe('Perfect');
    expect(byTestId('dictee-headline').textContent).toMatch(/So close/);
    expect(byTestId('dictee-feedback').getAttribute('data-tone')).toBe('close');
    expect(within(byTestId('dictee-marked')).getAllByRole('listitem').some(li => li.getAttribute('data-kind') === 'accent')).toBe(true);
    expect(byTestId('dictee-notes').textContent).toMatch(/Check the accent/);
  });

  it('says what was wrong for a wrong answer, and what the word should have been', async () => {
    await start();
    type('zzzzz');
    click(byTestId('dictee-check'));
    expect(byTestId('dictee-feedback').getAttribute('data-tone')).toBe('miss');
    expect(byTestId('dictee-notes').textContent).toMatch(/zzzzz/);
    expect(byTestId('dictee-score').textContent).toBe('0');
  });

  it('"I couldn’t hear it" shows the line, scores nothing and does not mark an empty answer', async () => {
    await start();
    click(byTestId('dictee-skip'));
    expect(byTestId('dictee-headline').textContent).toBe('Here is what was said');
    expect(screen.queryByTestId('dictee-marked')).toBeNull();
    expect(byTestId('dictee-score').textContent).toBe('0');
  });

  it('types an accented letter at the cursor from the letter bar, and keeps the cursor there', async () => {
    await start();
    type('ft');
    const input = box();
    input.setSelectionRange(1, 1);
    click(within(byTestId('dictee-accents')).getByRole('button', { name: 'Type é' }));
    expect(input.value).toBe('fét');
  });

  it('turns off spell-check and autocorrect on the answer box', async () => {
    await start();
    expect(box().getAttribute('spellcheck')).toBe('false');
    expect(box().getAttribute('autocorrect')).toBe('off');
    expect(box().getAttribute('autocapitalize')).toBe('none');
    expect(box().getAttribute('lang')).toBe('fr');
  });
});

describe('the end of a round', () => {
  async function perfectRound() {
    await start();
    for (let i = 0; i < 10; i++) await answerRight();
  }

  it('shows three stars and a best for a perfect round, and keeps the best', async () => {
    await perfectRound();
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(screen.getByText('New best')).toBeTruthy();
    expect(screen.getByText(/Every word was perfect/)).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('frenchCoach_dictee') ?? '{}');
    expect(stored.bests['words:A2']).toMatchObject({ stars: 3, accuracy: 100 });
    expect(stored.bests['words:A2'].score).toBeGreaterThan(1000);
    expect(stored.weak).toEqual([]);
  });

  it('lists what was missed, puts it in My slips, and drills only those', async () => {
    await start();
    const missed: string[] = [];
    for (let i = 0; i < 10; i++) {
      if (i < 4) {
        missed.push(heard());
        type('qqqq');
        click(byTestId('dictee-check'));
        click(byTestId('dictee-next'));
        await flush();
      } else await answerRight();
    }
    const review = byTestId('dictee-review');
    expect(within(review).getAllByRole('listitem')).toHaveLength(4);
    for (const fr of missed) expect(within(review).getByText(fr)).toBeTruthy();
    expect(screen.queryByText('New best')).toBeTruthy(); // 6 perfects still scores
    const stored = JSON.parse(localStorage.getItem('frenchCoach_dictee') ?? '{}');
    expect(stored.weak.map((w: { id: string }) => w.id).sort()).toHaveLength(4);
    // what was typed is never stored
    expect(JSON.stringify(stored)).not.toContain('qqqq');

    speak.mockClear();
    click(byTestId('dictee-drill'));
    await flush();
    expect(byTestId('dictee-progress').textContent).toBe('Word 1 of 4');
    expect(missed).toContain(heard());
  });

  it('a drill keeps no best', async () => {
    await start();
    for (let i = 0; i < 10; i++) {
      if (i < 3) {
        type('qqqq');
        click(byTestId('dictee-check'));
        click(byTestId('dictee-next'));
        await flush();
      } else await answerRight();
    }
    const before = JSON.stringify(JSON.parse(localStorage.getItem('frenchCoach_dictee') ?? '{}').bests);
    click(byTestId('dictee-drill'));
    await flush();
    for (let i = 0; i < 3; i++) await answerRight();
    expect(screen.queryByText('New best')).toBeNull();
    expect(JSON.stringify(JSON.parse(localStorage.getItem('frenchCoach_dictee') ?? '{}').bests)).toBe(before);
  });
});

describe('My slips', () => {
  const seed = (ids: string[], last: object | null) =>
    localStorage.setItem(
      'frenchCoach_dictee',
      JSON.stringify({ version: 1, bests: {}, last, weak: ids.map((id, i) => ({ id, clean: 0, at: i })), recent: [] }),
    );

  it('is offered once there are enough slips, draws only those lines from every level, and a round is short', async () => {
    const ids = ['w-a1-01', 'w-a2-02', 'w-b1-03', 'w-a1-04'];
    seed(ids, { format: 'words', level: 'A2', focus: 'slips' });
    renderScreen();
    expect(byTestId('dictee-focus-slips').getAttribute('aria-pressed')).toBe('true');
    expect(byTestId('dictee-start').textContent).toContain('Start · 4 words');
    click(byTestId('dictee-start'));
    await flush();
    expect(byTestId('dictee-progress').textContent).toBe('Word 1 of 4');
    const wanted = ids.map(id => DICTEE_ITEMS.find(i => i.id === id)!.fr);
    expect(wanted).toContain(heard());
  });

  it('a remembered My slips that has since emptied falls back to Anything', () => {
    seed(['w-a1-01'], { format: 'words', level: 'A1', focus: 'slips' });
    renderScreen();
    expect(screen.queryByTestId('dictee-focus-slips')).toBeNull();
    expect(byTestId('dictee-focus-any').getAttribute('aria-pressed')).toBe('true');
    expect((byTestId('dictee-start') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('leaving a round', () => {
  it('asks first, keeps the learner there on "Keep playing", and drops the round on "Leave round"', async () => {
    await start();
    click(screen.getByRole('button', { name: 'Leave round' }));
    expect(screen.getByText('Leave this round?')).toBeTruthy();
    click(byTestId('dictee-stay'));
    expect(screen.queryByText('Leave this round?')).toBeNull();
    expect(byTestId('dictee-progress')).toBeTruthy();

    type('qqqq');
    click(byTestId('dictee-check'));
    click(screen.getByRole('button', { name: 'Leave round' }));
    click(byTestId('dictee-leave'));
    expect(byTestId('dictee-start')).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('frenchCoach_dictee') ?? '{}');
    expect(stored.bests).toEqual({});
    expect(stored.weak).toHaveLength(1); // the line already checked is kept
    expect(TTS.stop).toHaveBeenCalled();
  });
});
