import { describe, expect, it } from 'vitest';
import { BOSS_BANK, topicOf } from '../bank';
import { BOSSES, GAUNTLET, getBoss, type Boss } from '../bosses';
import {
  COUNTER_DAMAGE,
  FOCUS_MAX,
  HEAVY_DAMAGE,
  HEAVY_EVERY,
  LOCK_ROUNDS,
  MEND_AMOUNT,
  PLAYER_MAX_HP,
  POISON_DAMAGE,
  POWER_COST,
  clearFog,
  createBattle,
  currentQuestion,
  isFogActive,
  moveStatus,
  nextRound,
  resolveRound,
  roundSeconds,
  starsFor,
  strikeDamage,
  summarize,
  veilPrompt,
  type BattleState,
  type Move,
} from '../engine';

const boss = (id: string): Boss => getBoss(id)!;

/** Answers the current question correctly with the given move. */
function right(state: BattleState, move: Move = 'strike'): BattleState {
  return resolveRound(state, { typed: currentQuestion(state).french[0], move });
}
function wrong(state: BattleState, move: Move = 'strike'): BattleState {
  return resolveRound(state, { typed: 'zzz', move });
}
/** Resolve then move on, unless the fight is over. */
function step(state: BattleState, answer: 'right' | 'wrong', move: Move = 'strike'): BattleState {
  const resolved = answer === 'right' ? right(state, move) : wrong(state, move);
  return resolved.stage === 'resolved' ? nextRound(resolved) : resolved;
}
/** A battle with the boss's health or the learner's set directly, for rule tests. */
function withState(state: BattleState, patch: Partial<BattleState>): BattleState {
  return { ...state, ...patch };
}

describe('createBattle', () => {
  it('starts a full-health fight on round 1 with the boss speaking first', () => {
    const state = createBattle(boss('gender'), 7);
    expect(state).toMatchObject({
      stage: 'answering', round: 1, phase: 1, bossHp: 100, playerHp: PLAYER_MAX_HP, focus: 0, combo: 0, guard: false,
      heavyIn: HEAVY_EVERY[1], poisoned: false, stunned: false, lock: null,
    });
    expect(state.speech).toBe(boss('gender').lines.intro);
  });

  it('is deterministic for a seed and different across seeds', () => {
    const ids = (seed: number) => createBattle(boss('past_tense'), seed).deck.map((q) => q.id).join();
    expect(ids(1)).toBe(ids(1));
    expect(ids(1)).not.toBe(ids(2));
  });

  it('deals the whole bank for its boss, once each', () => {
    for (const b of BOSSES) {
      const deck = createBattle(b, 3).deck;
      expect(deck.map((q) => q.id).sort()).toEqual(BOSS_BANK[b.id].map((q) => q.id).sort());
    }
  });
});

describe('a correct answer', () => {
  it('strikes for the base damage, charges Focus and builds a combo', () => {
    const state = right(createBattle(boss('gender'), 1));
    expect(state.bossHp).toBe(100 - strikeDamage(1, false));
    expect(state.focus).toBe(1);
    expect(state.combo).toBe(1);
    expect(state.stage).toBe('resolved');
    expect(state.last?.events).toContainEqual({ type: 'strike', damage: 14, power: false });
    expect(state.speech).toBeTruthy();
  });

  it('adds combo damage up to a cap', () => {
    expect([1, 2, 3].map((c) => strikeDamage(c, false))).toEqual([14, 16, 18]);
    expect(strikeDamage(6, false)).toBe(24);
    expect(strikeDamage(40, false)).toBe(24);
  });

  it('does not let the boss answer back', () => {
    const state = right(createBattle(boss('gender'), 1));
    expect(state.playerHp).toBe(PLAYER_MAX_HP);
  });

  it('caps Focus', () => {
    let state = createBattle(boss('subjunctive'), 1);
    for (let i = 0; i < 4; i++) state = step(state, 'right');
    expect(state.focus).toBe(FOCUS_MAX);
  });
});

describe('a wrong answer', () => {
  it('lets the boss counter, resets the combo and keeps Focus', () => {
    let state = step(createBattle(boss('gender'), 1), 'right');
    state = wrong(state);
    expect(state.playerHp).toBe(PLAYER_MAX_HP - COUNTER_DAMAGE[1]);
    expect(state.combo).toBe(0);
    expect(state.focus).toBe(1);
    expect(state.bossHp).toBe(100 - 14);
    expect(state.speech).toBeTruthy();
  });

  it('records each missed question once, with what was typed', () => {
    let state = wrong(createBattle(boss('gender'), 1));
    const first = state.last!.question;
    expect(state.misses).toEqual([{ question: first, typed: 'zzz', timedOut: false }]);
    // Same question again (a second fight round on a reshuffled deck) is not duplicated.
    state = withState(nextRound(state), { cursor: state.cursor });
    expect(wrong(withState(state, { stage: 'answering' })).misses).toHaveLength(1);
  });

  it('treats a timeout as a miss', () => {
    const state = resolveRound(createBattle(boss('past_tense'), 1), { typed: '', move: 'strike', timedOut: true });
    expect(state.last).toMatchObject({ correct: false, timedOut: true });
    expect(state.last!.events).toContainEqual({ type: 'timeout' });
    expect(state.playerHp).toBe(PLAYER_MAX_HP - COUNTER_DAMAGE[1]);
  });

  it('never accepts an empty answer', () => {
    expect(resolveRound(createBattle(boss('gender'), 1), { typed: '   ', move: 'strike' }).last?.correct).toBe(false);
  });
});

describe('moves', () => {
  it('Power needs Focus, doubles the strike and costs Focus either way', () => {
    let state = createBattle(boss('subjunctive'), 1);
    expect(moveStatus(state, 'power')).toEqual({ usable: false, reason: `Needs ${POWER_COST} Focus` });
    state = step(step(state, 'right'), 'right'); // Focus 2, combo 2
    expect(moveStatus(state, 'power').usable).toBe(true);
    const hit = right(state, 'power');
    expect(hit.bossHp).toBe(state.bossHp - strikeDamage(3, true));
    expect(hit.focus).toBe(1); // 2 - 2 + 1
    const miss = wrong(state, 'power');
    expect(miss.focus).toBe(0);
    expect(miss.playerHp).toBe(PLAYER_MAX_HP - Math.round(COUNTER_DAMAGE[1] * 1.5));
  });

  it('Guard on a correct answer blocks the next counter, once', () => {
    let state = step(createBattle(boss('subjunctive'), 1), 'right', 'guard');
    expect(state.guard).toBe(true);
    expect(state.bossHp).toBe(150); // guarding deals no damage
    state = wrong(state);
    expect(state.guard).toBe(false);
    expect(state.playerHp).toBe(PLAYER_MAX_HP);
    expect(state.last!.events).toContainEqual({ type: 'blocked', source: 'counter' });
    expect(state.stats.blocked).toBe(1);
    expect(moveStatus(withState(state, { guard: true }), 'guard')).toEqual({ usable: false, reason: 'Already up' });
  });

  it('Guard on a wrong answer is not raised', () => {
    const state = wrong(createBattle(boss('subjunctive'), 1), 'guard');
    expect(state.guard).toBe(false);
    expect(state.playerHp).toBe(PLAYER_MAX_HP - COUNTER_DAMAGE[1]);
  });

  it('Mend heals up to the maximum and costs 1 Focus', () => {
    let state = step(createBattle(boss('subjunctive'), 1), 'right');
    state = withState(state, { playerHp: 70 });
    const healed = right(state, 'mend');
    expect(healed.playerHp).toBe(70 + MEND_AMOUNT);
    expect(healed.focus).toBe(1); // 1 - 1 + 1
    const nearlyFull = right(withState(state, { playerHp: 90 }), 'mend');
    expect(nearlyFull.playerHp).toBe(100);
    expect(nearlyFull.last!.events).toContainEqual({ type: 'heal', amount: 10 });
  });

  it('Mend is unavailable at full health', () => {
    const state = withState(createBattle(boss('gender'), 1), { focus: 3 });
    expect(moveStatus(state, 'mend')).toEqual({ usable: false, reason: 'Full health' });
  });

  it('an unusable move falls back to Strike', () => {
    const state = createBattle(boss('gender'), 1); // no Focus
    const result = right(state, 'power');
    expect(result.last!.move).toBe('strike');
    expect(result.bossHp).toBe(100 - strikeDamage(1, false));
  });
});

describe('phases', () => {
  it('turns enraged at half health and hits harder', () => {
    let state = withState(createBattle(boss('gender'), 1), { bossHp: 60 });
    state = right(state); // 60 - 14 = 46 <= 50
    expect(state.phase).toBe(2);
    expect(state.last!.events).toContainEqual({ type: 'phase2' });
    expect(state.speech).toBe(boss('gender').lines.enraged);
    const hurt = wrong(nextRound(state));
    expect(hurt.last!.events).toContainEqual({ type: 'counter', damage: COUNTER_DAMAGE[2] });
  });
});

describe('the heavy blow', () => {
  it('lands every few rounds when not blocked', () => {
    let state = createBattle(boss('subjunctive'), 1);
    for (let i = 0; i < HEAVY_EVERY[1] - 1; i++) state = step(state, 'right');
    expect(state.heavyIn).toBe(1);
    const blow = right(state);
    expect(blow.last!.events).toContainEqual({ type: 'heavy', damage: HEAVY_DAMAGE[1] });
    expect(blow.playerHp).toBe(PLAYER_MAX_HP - HEAVY_DAMAGE[1]);
    expect(blow.heavyIn).toBe(HEAVY_EVERY[1]);
  });

  it('is blocked by a Guard raised the same round', () => {
    let state = createBattle(boss('subjunctive'), 1);
    for (let i = 0; i < HEAVY_EVERY[1] - 1; i++) state = step(state, 'right');
    const guarded = right(state, 'guard');
    expect(guarded.playerHp).toBe(PLAYER_MAX_HP);
    expect(guarded.guard).toBe(false);
    expect(guarded.last!.events.map((e) => e.type)).toEqual(['guard-up', 'blocked']);
  });

  it('uses the strength the boss had when the round began, then comes sooner once enraged', () => {
    const turning = right(withState(createBattle(boss('gender'), 1), { bossHp: 60, heavyIn: 1 }));
    expect(turning.phase).toBe(2);
    expect(turning.last!.events).toContainEqual({ type: 'heavy', damage: HEAVY_DAMAGE[1] });

    const state = withState(createBattle(boss('gender'), 1), { bossHp: 60 });
    const enraged = right(state);
    expect(enraged.heavyIn).toBeLessThanOrEqual(HEAVY_EVERY[1]);
    let after = nextRound(enraged);
    after = withState(after, { heavyIn: 1 });
    expect(right(after).heavyIn).toBe(HEAVY_EVERY[2]);
  });
});

describe("Le Golem du Futur — Stone Slam", () => {
  const golem = boss('future');
  it('stuns after an unblocked heavy blow: next round is Strike only', () => {
    let state = withState(createBattle(golem, 1), { heavyIn: 1, focus: 3 });
    state = right(state);
    expect(state.stunned).toBe(true);
    expect(state.last!.events).toContainEqual({ type: 'stunned' });
    state = nextRound(state);
    expect(moveStatus(state, 'power')).toEqual({ usable: false, reason: 'Stunned' });
    expect(moveStatus(state, 'strike').usable).toBe(true);
    expect(right(state, 'power').last!.move).toBe('strike');
    expect(right(state).stunned).toBe(false); // the stun lasts one round
  });

  it('does not stun when the blow is blocked', () => {
    const state = right(withState(createBattle(golem, 1), { heavyIn: 1 }), 'guard');
    expect(state.stunned).toBe(false);
  });
});

describe("L'Ombre de la Négation — Venom", () => {
  const shadow = boss('negation');
  it('poisons on a miss without ticking that same round', () => {
    const state = wrong(createBattle(shadow, 1));
    expect(state.poisoned).toBe(true);
    expect(state.playerHp).toBe(PLAYER_MAX_HP - COUNTER_DAMAGE[1]);
  });

  it('ticks each following round and is cured after two correct answers in a row', () => {
    let state = nextRound(wrong(createBattle(shadow, 1)));
    state = right(state); // first correct: still poisoned, ticks
    expect(state.poisoned).toBe(true);
    expect(state.last!.events).toContainEqual({ type: 'poison-tick', damage: POISON_DAMAGE });
    state = right(nextRound(state)); // second: cured, no tick
    expect(state.poisoned).toBe(false);
    expect(state.last!.events.map((e) => e.type)).toContain('cured');
    expect(state.last!.events.map((e) => e.type)).not.toContain('poison-tick');
  });

  it('a miss while poisoned restarts the cure', () => {
    let state = nextRound(wrong(createBattle(shadow, 1)));
    state = nextRound(right(state));
    expect(state.cure).toBe(1);
    state = wrong(state);
    expect(state.cure).toBe(0);
    expect(state.poisoned).toBe(true);
  });

  it('can never finish the learner off', () => {
    let state = nextRound(wrong(createBattle(shadow, 1)));
    state = withState(state, { playerHp: 2, heavyIn: 9 });
    state = right(state);
    expect(state.playerHp).toBe(1);
    expect(state.stage).toBe('resolved');
  });
});

describe('La Reine du Genre — Gender Lock', () => {
  const queen = boss('gender');
  it('locks one move for two rounds after a miss, rotating through them', () => {
    let state = wrong(createBattle(queen, 1));
    expect(state.lock).toEqual({ move: 'power', rounds: LOCK_ROUNDS });
    state = nextRound(state);
    expect(moveStatus(withState(state, { focus: 3 }), 'power')).toEqual({ usable: false, reason: 'Locked' });
    state = nextRound(right(state)); // round 2 of the lock
    expect(state.lock).toEqual({ move: 'power', rounds: 1 });
    state = nextRound(right(state)); // lock has run out
    expect(state.lock).toBeNull();
    const second = wrong(state);
    expect(second.lock).toEqual({ move: 'guard', rounds: LOCK_ROUNDS });
  });
});

describe('Le Sorcier du Subjonctif — Fog of Doubt', () => {
  const sorcerer = boss('subjunctive');
  const enraged = (): BattleState => withState(createBattle(sorcerer, 1), { phase: 2, combo: 3 });

  it('veils half of the prompt in phase 2 only', () => {
    expect(isFogActive(createBattle(sorcerer, 1))).toBe(false);
    expect(isFogActive(enraged())).toBe(true);
    expect(veilPrompt('I want you to come.')).toBe('I want you ··· ···');
    expect(veilPrompt('Hello')).toBe('···');
  });

  it('clearing the fog breaks the combo and lasts the round', () => {
    const cleared = clearFog(enraged());
    expect(cleared.combo).toBe(0);
    expect(isFogActive(cleared)).toBe(false);
    expect(clearFog(cleared)).toBe(cleared); // a second clear changes nothing
    const next = nextRound(right(cleared));
    expect(next.fogCleared).toBe(false);
    expect(isFogActive(next)).toBe(true);
  });

  it('other bosses have no fog', () => {
    expect(isFogActive(withState(createBattle(boss('gender'), 1), { phase: 2 }))).toBe(false);
  });
});

describe('Le Chevalier du Passé — Quickened Time', () => {
  const knight = boss('past_tense');
  it('puts a clock on phase 2 only', () => {
    expect(roundSeconds(createBattle(knight, 1))).toBeNull();
    expect(roundSeconds(withState(createBattle(knight, 1), { phase: 2 }))).toBe(15);
    expect(roundSeconds(withState(createBattle(boss('gender'), 1), { phase: 2 }))).toBeNull();
  });
});

describe('Le Maître du Défi — the Gauntlet', () => {
  const all = Object.values(BOSS_BANK).flat();

  it('is not a grammar boss, but getBoss finds it', () => {
    expect((BOSSES as readonly Boss[]).some((b) => b.id === 'gauntlet')).toBe(false);
    expect(getBoss('gauntlet')).toBe(GAUNTLET);
  });

  it('deals every question of every boss exactly once', () => {
    const deck = createBattle(GAUNTLET, 3).deck;
    expect(deck).toHaveLength(all.length);
    expect(deck.map((q) => q.id).sort()).toEqual(all.map((q) => q.id).sort());
  });

  it('keeps the topics changing: each run of ten questions holds ten different topics', () => {
    const deck = createBattle(GAUNTLET, 9).deck;
    for (let i = 0; i < 20; i += 10) {
      const topics = deck.slice(i, i + 10).map((q) => topicOf(q.id));
      expect(new Set(topics).size).toBe(BOSSES.length);
    }
  });

  it('is deterministic for a seed and different across seeds', () => {
    const ids = (seed: number) => createBattle(GAUNTLET, seed).deck.map((q) => q.id).join();
    expect(ids(4)).toBe(ids(4));
    expect(ids(4)).not.toBe(ids(5));
  });

  it('puts a 25-second clock on round one and a 15-second clock once enraged', () => {
    expect(roundSeconds(createBattle(GAUNTLET, 1))).toBe(25);
    expect(roundSeconds(withState(createBattle(GAUNTLET, 1), { phase: 2 }))).toBe(15);
  });

  it('a flawless player wins within sixteen rounds; answering everything wrong loses', () => {
    let state = createBattle(GAUNTLET, 11);
    let rounds = 0;
    while (state.stage === 'answering' || state.stage === 'resolved') {
      const guard = state.heavyIn === 1 && moveStatus(state, 'guard').usable;
      const power = !guard && moveStatus(state, 'power').usable;
      state = step(state, 'right', guard ? 'guard' : power ? 'power' : 'strike');
      if (++rounds > 40) break;
    }
    expect(state.stage).toBe('won');
    expect(rounds).toBeLessThanOrEqual(16);

    let lost = createBattle(GAUNTLET, 11);
    for (let i = 0; i < 40 && (lost.stage === 'answering' || lost.stage === 'resolved'); i++) lost = step(lost, 'wrong');
    expect(lost.stage).toBe('lost');
  });

  it('mixed play (one miss in four) is winnable', () => {
    let state = createBattle(GAUNTLET, 21);
    for (let i = 0; i < 60 && (state.stage === 'answering' || state.stage === 'resolved'); i++) {
      const guard = state.heavyIn === 1 && moveStatus(state, 'guard').usable;
      const power = !guard && moveStatus(state, 'power').usable;
      state = step(state, i % 4 === 3 ? 'wrong' : 'right', guard ? 'guard' : power ? 'power' : 'strike');
    }
    expect(state.stage).toBe('won');
  });
});

describe('the end of a fight', () => {
  it('is won the moment the boss reaches 0, before it can answer back', () => {
    const state = right(withState(createBattle(boss('gender'), 1), { bossHp: 10, heavyIn: 1 }));
    expect(state.stage).toBe('won');
    expect(state.bossHp).toBe(0);
    expect(state.playerHp).toBe(PLAYER_MAX_HP);
    expect(state.speech).toBe(boss('gender').lines.beaten);
    expect(resolveRound(state, { typed: 'x', move: 'strike' })).toBe(state); // nothing more happens
    expect(nextRound(state)).toBe(state);
  });

  it('is lost when the learner reaches 0', () => {
    const state = wrong(withState(createBattle(boss('gender'), 1), { playerHp: 5 }));
    expect(state.stage).toBe('lost');
    expect(state.playerHp).toBe(0);
    expect(state.last!.events[state.last!.events.length - 1]).toEqual({ type: 'defeat' });
    expect(state.speech).toBe(boss('gender').lines.wins);
  });

  it('does not land a heavy blow on someone already beaten', () => {
    const state = wrong(withState(createBattle(boss('gender'), 1), { playerHp: 5, heavyIn: 1 }));
    expect(state.last!.events.map((e) => e.type)).toEqual(['counter', 'locked', 'defeat']);
  });

  it('awards stars by health left, and none for a loss', () => {
    expect(starsFor({ stage: 'won', playerHp: 100 })).toBe(3);
    expect(starsFor({ stage: 'won', playerHp: 80 })).toBe(3);
    expect(starsFor({ stage: 'won', playerHp: 79 })).toBe(2);
    expect(starsFor({ stage: 'won', playerHp: 50 })).toBe(2);
    expect(starsFor({ stage: 'won', playerHp: 49 })).toBe(1);
    expect(starsFor({ stage: 'lost', playerHp: 0 })).toBe(0);
  });

  it('summarises accuracy, combo and misses', () => {
    let state = createBattle(boss('gender'), 1);
    state = step(step(step(state, 'right'), 'wrong'), 'right');
    const summary = summarize(state);
    expect(summary).toMatchObject({ won: false, rounds: 3, correct: 2, wrong: 1, accuracy: 67, maxCombo: 1 });
    expect(summary.misses).toHaveLength(1);
  });
});

describe('the deck', () => {
  it('never repeats a question until the bank is used, then reshuffles without an immediate repeat', () => {
    const b = boss('gender');
    let state = withState(createBattle(b, 5), { playerHp: 10_000, bossHp: 10_000 });
    const seen: string[] = [];
    const total = BOSS_BANK.gender.length;
    for (let i = 0; i < total; i++) {
      seen.push(currentQuestion(state).id);
      state = nextRound(wrong(withState(state, { playerHp: 10_000 })));
    }
    expect(new Set(seen).size).toBe(total);
    expect(currentQuestion(state).id).not.toBe(seen[total - 1]);
  });
});

describe('balance', () => {
  it.each(BOSSES.map((b) => [b.id, b] as const))('%s: a flawless player wins in a short fight', (_id, b) => {
    let state = createBattle(b, 11);
    let rounds = 0;
    while (state.stage === 'answering' || state.stage === 'resolved') {
      // Guard when the heavy blow is due and Guard is available, otherwise strike.
      const guard = state.heavyIn === 1 && moveStatus(state, 'guard').usable;
      state = step(state, 'right', guard ? 'guard' : 'strike');
      if (++rounds > 40) break;
    }
    expect(state.stage).toBe('won');
    expect(rounds).toBeLessThanOrEqual(12);
    expect(starsFor(state)).toBeGreaterThanOrEqual(2);
  });

  it.each(BOSSES.map((b) => [b.id, b] as const))('%s: answering everything wrong loses, quickly', (_id, b) => {
    let state = createBattle(b, 11);
    let rounds = 0;
    while (state.stage === 'answering' || state.stage === 'resolved') {
      state = step(state, 'wrong');
      if (++rounds > 40) break;
    }
    expect(state.stage).toBe('lost');
    expect(rounds).toBeLessThanOrEqual(10);
  });

  it('mixed play (one miss in four) is winnable on every boss', () => {
    for (const b of BOSSES) {
      let state = createBattle(b, 21);
      for (let i = 0; i < 60 && (state.stage === 'answering' || state.stage === 'resolved'); i++) {
        const guard = state.heavyIn === 1 && moveStatus(state, 'guard').usable;
        const power = !guard && moveStatus(state, 'power').usable;
        state = step(state, i % 4 === 3 ? 'wrong' : 'right', guard ? 'guard' : power ? 'power' : 'strike');
      }
      expect(state.stage, b.id).toBe('won');
    }
  });
});
