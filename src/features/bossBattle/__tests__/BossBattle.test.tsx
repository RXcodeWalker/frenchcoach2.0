// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The shared top bar reads the learner's profile and the shop catalogue; this test is about the fight, so it is
// replaced by a plain bar with a back button. The app state hook is mocked as a tripwire: a fight must never use it.
const dispatch = vi.fn();
vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({ state: { profile: { total_xp: 0, streak_days: 0 } }, dispatch }),
  dispatchAddXP: (...args: unknown[]) => dispatch(...args),
}));
vi.mock('../../../components/TopContextBar', () => ({
  TopContextBar: ({ title, subtitle, showBack, onBack, backLabel }: { title: string; subtitle?: string; showBack?: boolean; onBack?: () => void; backLabel?: string }) => (
    <header>
      {showBack && <button type="button" aria-label={backLabel ?? 'Back'} onClick={onBack} />}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  ),
}));

import { BossBattle } from '../../../screens/BossBattle';
import { BOSS_BANK, type BossQuestion } from '../bank';
import { getBoss } from '../bosses';
import { STORAGE_KEYS } from '../../../services/persistence/storage';

const allQuestions = Object.values(BOSS_BANK).flat();
const byEnglish = (english: string): BossQuestion => {
  const found = allQuestions.find((q) => q.english === english);
  if (!found) throw new Error(`prompt not in the bank: ${english}`);
  return found;
};

const prompt = () => screen.getByTestId('boss-prompt').textContent ?? '';
const input = () => screen.getByLabelText('Your answer in French') as HTMLInputElement;

function answer(text: string, button = /^(Strike|Power strike|Raise guard|Mend)$/) {
  fireEvent.change(input(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: button }));
}
const answerRight = (button?: RegExp) => answer(byEnglish(prompt()).french[0], button);
const answerWrong = () => answer('zzz');
const next = () => fireEvent.click(screen.getByRole('button', { name: /Next round|See the result/ }));

function openBoss(id: string) {
  render(
    <MemoryRouter>
      <BossBattle />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByTestId(`boss-${id}`));
}

beforeEach(() => {
  localStorage.clear();
  dispatch.mockClear();
});
afterEach(cleanup);

describe('Boss Battles — choose a boss', () => {
  it('lists the ten bosses and the Gauntlet, marks the first unbeaten boss, and explains the moves', () => {
    render(
      <MemoryRouter>
        <BossBattle />
      </MemoryRouter>,
    );
    for (const id of ['gender', 'quantity', 'past_tense', 'negation', 'pronouns', 'comparison', 'future', 'conditional', 'time', 'subjunctive', 'gauntlet']) {
      expect(screen.getByTestId(`boss-${id}`)).toBeTruthy();
    }
    expect(within(screen.getByTestId('boss-gender')).getByText('Next up')).toBeTruthy();
    expect(screen.getAllByText('Next up')).toHaveLength(1);
    expect(screen.getByText('How a fight works')).toBeTruthy();
    expect(screen.getAllByText('Not fought yet')).toHaveLength(11);
    expect(screen.getByText('Mixed challenge')).toBeTruthy();
  });

  it('promises no XP', () => {
    render(
      <MemoryRouter>
        <BossBattle />
      </MemoryRouter>,
    );
    expect(document.body.textContent).not.toMatch(/\bXP\b/);
  });
});

describe('a fight', () => {
  it('opens on round 1 with both fighters at full health and the boss speaking', () => {
    openBoss('gender');
    expect(screen.getByText(/Round 1 · Say it in French/)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Boss health' }).getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByRole('progressbar', { name: 'Your health' }).getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByTestId('boss-speech').textContent).toContain(getBoss('gender')!.lines.intro);
    expect(document.activeElement).toBe(input());
  });

  it('a correct answer hurts the boss and says so; Enter in the box submits', () => {
    openBoss('gender');
    fireEvent.change(input(), { target: { value: byEnglish(prompt()).french[0] } });
    fireEvent.submit(input().closest('form')!);
    expect(screen.getByRole('heading', { name: 'Correct' })).toBeTruthy();
    expect(screen.getByText('You strike for 14.')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Boss health' }).getAttribute('aria-valuenow')).toBe('86');
    expect(screen.getByRole('progressbar', { name: 'Your health' }).getAttribute('aria-valuenow')).toBe('100');
    // Continue takes focus so the next round is one keypress away.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next round' }));
  });

  it('a wrong answer costs health, shows the model answer and the rule', () => {
    openBoss('negation');
    const q = byEnglish(prompt());
    answerWrong();
    expect(screen.getByRole('heading', { name: 'Not quite' })).toBeTruthy();
    expect(screen.getByTestId('boss-model-answer').textContent).toContain(q.french[0]);
    expect(screen.getByText(q.tip)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Your health' }).getAttribute('aria-valuenow')).toBe('88');
    expect(screen.getByText('Poisoned')).toBeTruthy();
  });

  it('accents, case and punctuation are optional', () => {
    openBoss('gender');
    answer(byEnglish(prompt()).french[0].toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\./g, ''));
    expect(screen.getByRole('heading', { name: 'Correct' })).toBeTruthy();
  });

  it('will not submit an empty answer', () => {
    openBoss('gender');
    expect((screen.getByRole('button', { name: 'Strike' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(input().closest('form')!);
    expect(screen.queryByTestId('boss-report')).toBeNull();
  });

  it('locks moves the learner cannot use, with the reason, and Power opens once Focus is charged', () => {
    openBoss('subjunctive');
    const power = screen.getByRole('button', { name: /Power/ }) as HTMLButtonElement;
    expect(power.disabled).toBe(true);
    expect(power.textContent).toContain('Needs 2 Focus');
    expect((screen.getByRole('button', { name: /Mend/ }) as HTMLButtonElement).textContent).toContain('Needs 1 Focus');

    answerRight();
    next();
    answerRight();
    next();
    expect((screen.getByRole('button', { name: /Power/ }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /Power/ }));
    expect(screen.getByRole('button', { name: 'Power strike' })).toBeTruthy();
  });

  it('Guard raises a shield that shows as a status', () => {
    openBoss('subjunctive');
    fireEvent.click(screen.getByRole('button', { name: /Guard/ }));
    answerRight();
    expect(screen.getByText('Guard up. It will block the next hit.')).toBeTruthy();
    next();
    expect(screen.getByText('Guard up')).toBeTruthy();
  });

  it('telegraphs the heavy blow, and says "this round" when it is due', () => {
    openBoss('subjunctive');
    expect(screen.getByText('Heavy blow in 4 rounds')).toBeTruthy();
    for (let i = 0; i < 3; i++) {
      answerRight();
      next();
    }
    expect(screen.getByText('Heavy blow this round')).toBeTruthy();
  });

  it('asks to confirm before leaving mid-fight, and keeps fighting on cancel', () => {
    openBoss('gender');
    fireEvent.click(screen.getByRole('button', { name: 'Leave the battle' }));
    expect(screen.getByText('Leave this battle?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep fighting' }));
    expect(screen.queryByText('Leave this battle?')).toBeNull();
    expect(screen.getByTestId('boss-prompt')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Leave the battle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(screen.getByText('How a fight works')).toBeTruthy();
    // A fight left half-way is not recorded.
    expect(localStorage.length).toBe(0);
  });
});

describe('the end of a fight', () => {
  it('victory: stars, the numbers, a rematch — and a record, but no XP or app state', () => {
    openBoss('gender');
    for (let i = 0; i < 40 && !screen.queryByRole('button', { name: 'See the result' }); i++) {
      answerRight();
      if (screen.queryByRole('button', { name: 'Next round' })) next();
    }
    next(); // "See the result"

    expect(screen.getByRole('heading', { name: /La Reine du Genre is defeated/ })).toBeTruthy();
    expect(screen.getByText('Victory')).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(screen.getByText('Your first win against this boss.')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.queryByText('Worth another look')).toBeNull();
    expect(screen.getByRole('button', { name: 'Fight again' })).toBeTruthy();

    // The only thing written is the learner's own record.
    expect(dispatch).not.toHaveBeenCalled();
    const keys = Object.keys(localStorage);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith(STORAGE_KEYS.bossBattle)).toBe(true);
    const saved = JSON.parse(localStorage.getItem(keys[0])!);
    expect(saved.bosses.gender).toMatchObject({ fights: 1, wins: 1, stars: 3 });

    // Back on the list the boss shows its stars.
    fireEvent.click(screen.getByRole('button', { name: 'Choose another boss' }));
    expect(within(screen.getByTestId('boss-gender')).getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(within(screen.getByTestId('boss-gender')).getByText(/Won 1 of 1/)).toBeTruthy();
    expect(within(screen.getByTestId('boss-quantity')).getByText('Next up')).toBeTruthy();
  });

  it('defeat: lists every missed question with its answer and rule, then lets you go again', () => {
    openBoss('gender');
    const missed: BossQuestion[] = [];
    for (let i = 0; i < 40 && !screen.queryByRole('button', { name: 'See the result' }); i++) {
      missed.push(byEnglish(prompt()));
      answerWrong();
      if (screen.queryByRole('button', { name: 'Next round' })) next();
    }
    next();

    expect(screen.getByText('Defeated')).toBeTruthy();
    expect(screen.queryByRole('img', { name: /stars/ })).toBeNull();
    const rows = screen.getAllByTestId('boss-miss');
    expect(rows).toHaveLength(missed.length);
    expect(rows[0].textContent).toContain(missed[0].french[0]);
    expect(rows[0].textContent).toContain(missed[0].tip);

    const saved = JSON.parse(localStorage.getItem(Object.keys(localStorage)[0])!);
    expect(saved.bosses.gender).toMatchObject({ fights: 1, wins: 0, stars: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText(/Round 1 · Say it in French/)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Your health' }).getAttribute('aria-valuenow')).toBe('100');
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('the Gauntlet in the UI', () => {
  it('starts on a 25-second clock and tags every question with its topic', () => {
    openBoss('gauntlet');
    expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('25 seconds left');
    const topics = new Set<string>();
    // Six rounds is short of a win (180 health), and each of them comes from a different topic.
    for (let i = 0; i < 6; i++) {
      topics.add(screen.getByTestId('boss-topic').textContent ?? '');
      answerRight();
      next();
    }
    expect(topics.size).toBe(6);
  });

  it('a won Gauntlet is recorded under its own name and says how to get back', () => {
    openBoss('gauntlet');
    for (let i = 0; i < 60 && !screen.queryByRole('button', { name: 'See the result' }); i++) {
      answerRight();
      if (screen.queryByRole('button', { name: 'Next round' })) next();
    }
    next();
    expect(screen.getByRole('heading', { name: /Le Maître du Défi is defeated/ })).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem(Object.keys(localStorage)[0])!);
    expect(saved.bosses.gauntlet).toMatchObject({ fights: 1, wins: 1 });
    expect(dispatch).not.toHaveBeenCalled();
    const back = screen.getAllByRole('button', { name: 'Back to the bosses' });
    fireEvent.click(back[back.length - 1]);
    expect(within(screen.getByTestId('boss-gauntlet')).getByText(/Won 1 of 1/)).toBeTruthy();
  });

  it('a missed Gauntlet question shows its topic in the list', () => {
    openBoss('gauntlet');
    answerWrong();
    for (let i = 0; i < 60 && !screen.queryByRole('button', { name: 'See the result' }); i++) {
      if (screen.queryByRole('button', { name: 'Next round' })) next();
      answerWrong();
    }
    next();
    expect(within(screen.getAllByTestId('boss-miss')[0]).getByTestId('boss-topic')).toBeTruthy();
  });
});

describe('boss tricks in the UI', () => {
  it('Fog of Doubt: in the enraged phase the prompt is veiled until cleared', () => {
    openBoss('subjunctive');
    // Win rounds with Power until the boss is at half health.
    let guard = 0;
    while (!screen.queryByText('Enraged') && guard++ < 20) {
      const power = screen.getByRole('button', { name: /Power/ }) as HTMLButtonElement;
      if (!power.disabled) fireEvent.click(power);
      answerRight();
      next();
    }
    expect(screen.getByText('Enraged')).toBeTruthy();
    expect(prompt()).toContain('···');
    fireEvent.click(screen.getByRole('button', { name: 'Clear the fog' }));
    expect(prompt()).not.toContain('···');
    expect(screen.queryByRole('button', { name: 'Clear the fog' })).toBeNull();
  });

  it('Quickened Time: the enraged Knight puts a clock on every answer, and a timeout is a miss', () => {
    vi.useFakeTimers();
    try {
      openBoss('past_tense');
      expect(screen.queryByRole('timer')).toBeNull();
      let guard = 0;
      while (!screen.queryByText('Enraged') && guard++ < 20) {
        const power = screen.getByRole('button', { name: /Power/ }) as HTMLButtonElement;
        if (!power.disabled) fireEvent.click(power);
        answerRight();
        next();
      }
      expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('15 seconds left');
      const before = Number(screen.getByRole('progressbar', { name: 'Your health' }).getAttribute('aria-valuenow'));
      act(() => {
        vi.advanceTimersByTime(15_500);
      });
      expect(screen.getByRole('heading', { name: 'Time’s up' })).toBeTruthy();
      expect(Number(screen.getByRole('progressbar', { name: 'Your health' }).getAttribute('aria-valuenow'))).toBeLessThan(before);
    } finally {
      vi.useRealTimers();
    }
  });
});
