// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const app = { state: { notebook: [] as Array<{ answer: string }> } };
vi.mock('../../context/AppContext', () => ({ useApp: () => app }));
vi.mock('../../components/TopContextBar', () => ({
  TopContextBar: ({ subtitle, onBack, backLabel }: { subtitle?: string; onBack?: () => void; backLabel?: string }) => (
    <header>
      <span data-testid="subtitle">{subtitle}</span>
      <button onClick={onBack}>{backLabel}</button>
    </header>
  ),
}));
const labProps = vi.fn();
vi.mock('../../features/pronunciation/LabPractice', () => ({
  LabPractice: (props: { targetSentence: string; entry: string; onDone: () => void }) => {
    labProps(props);
    return (
      <div data-testid="lab-practice">
        {props.targetSentence}
        <button onClick={props.onDone}>Done</button>
      </div>
    );
  },
}));
vi.mock('../../features/pronunciation/audio/nativeVoice', () => ({
  playNative: vi.fn(async () => 'recorded'),
  stopNative: vi.fn(),
}));
vi.mock('../../services/telemetry/telemetryService', () => ({ track: vi.fn(), captureError: vi.fn() }));

import { LearnSounds } from '../LearnSounds';

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(() => {
  cleanup();
  labProps.mockClear();
  app.state.notebook = [];
});

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/learn/sounds']}>
      <Routes>
        <Route path="/learn/sounds" element={<LearnSounds />} />
        <Route path="/learn" element={<p>Learn topics</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const click = async (el: HTMLElement) => act(async () => { fireEvent.click(el); });

describe('LearnSounds (Lab home screen)', () => {
  it('opens on the home, and Back leaves the Lab for Learn', async () => {
    renderScreen();
    expect(screen.getByTestId('sounds-home')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Learn' })).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Back to Learn' }));
    expect(screen.getByText('Learn topics')).toBeTruthy();
  });

  it('a sound opens its guide; Back steps out to the home first', async () => {
    renderScreen();
    await click(screen.getByTestId('family-uOu'));
    expect(screen.getByTestId('sound-guide')).toBeTruthy();
    expect(screen.getByTestId('subtitle').textContent).toBe('U and OU');
    await click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('sounds-home')).toBeTruthy();
  });

  it('"Say it" on a guide word opens the Lab on that word, and Done returns to the same guide', async () => {
    renderScreen();
    await click(screen.getByTestId('family-uOu'));
    await click(screen.getByRole('button', { name: 'Say « rue »' }));
    expect(labProps).toHaveBeenLastCalledWith(expect.objectContaining({ targetSentence: 'rue', entry: 'sound_guide' }));
    await click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByTestId('sound-guide')).toBeTruthy();
  });

  it('ear training and tricky words open from the home', async () => {
    renderScreen();
    await click(screen.getByTestId('sounds-ear'));
    expect(screen.getByTestId('ear-training')).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Back' }));
    await click(screen.getByTestId('sounds-tricky'));
    expect(screen.getByTestId('tricky-words')).toBeTruthy();
  });

  it('the guide\'s ear-training button starts on that sound', async () => {
    renderScreen();
    await click(screen.getByTestId('family-uOu'));
    await click(screen.getByRole('button', { name: /Ear training for this sound/ }));
    expect(within(screen.getByTestId('ear-training')).getByRole('button', { name: 'U and OU' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('picks a sentence to practise: the Lab opens on exactly that sentence as the home\'s entry, Done goes back to the picker', async () => {
    renderScreen();
    await click(screen.getByTestId('sounds-practise'));
    const first = within(screen.getByTestId('practice-picker')).getAllByRole('listitem')[0];
    const sentence = first.textContent ?? '';
    await click(within(first).getByRole('button'));
    expect(labProps).toHaveBeenLastCalledWith(expect.objectContaining({ targetSentence: sentence, entry: 'lab_home' }));
    await click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByTestId('practice-picker')).toBeTruthy();
  });

  it('the guide\'s sentences button opens the picker filtered to that sound', async () => {
    renderScreen();
    await click(screen.getByTestId('family-liaison'));
    await click(screen.getByRole('button', { name: /Practise sentences with this sound/ }));
    expect((screen.getByLabelText('Sound') as HTMLSelectElement).value).toBe('liaison');
  });

  it('offers the notebook as a source when the learner has kept answers', async () => {
    app.state.notebook = [{ answer: 'Hier, je suis allé au cinéma avec mes amis.' }];
    renderScreen();
    await click(screen.getByTestId('sounds-practise'));
    expect(screen.getByRole('button', { name: 'My notebook' })).toBeTruthy();
  });
});
