import type { Boss } from './bosses';
import { MOVE_VISUALS } from './bossVisuals';
import { LOCK_ROUNDS, POISON_CURE_STREAK, POISON_DAMAGE, type BattleEvent } from './engine';

/** What happened in a round, in plain words — one line per event. */
export function describeEvent(event: BattleEvent, boss: Boss): string {
  switch (event.type) {
    case 'strike':
      return event.power ? `Power strike! ${event.damage} damage.` : `You strike for ${event.damage}.`;
    case 'guard-up':
      return 'Guard up. It will block the next hit.';
    case 'heal':
      return event.amount > 0 ? `You mend ${event.amount} health.` : 'You were already at full health.';
    case 'counter':
      return `${boss.name} hits back for ${event.damage}.`;
    case 'heavy':
      return `Heavy blow! ${event.damage} damage.`;
    case 'blocked':
      return `Your guard blocks the ${event.source === 'heavy' ? 'heavy blow' : 'counter-attack'}.`;
    case 'phase2':
      return `${boss.name} is enraged. It hits harder now.`;
    case 'poisoned':
      return `You are poisoned: ${POISON_DAMAGE} damage a round until you answer ${POISON_CURE_STREAK} in a row.`;
    case 'poison-tick':
      return `Poison: ${event.damage} damage.`;
    case 'cured':
      return 'The poison is gone.';
    case 'stunned':
      return 'Stunned. Your next move can only be Strike.';
    case 'locked':
      return `${MOVE_VISUALS[event.move].label} is locked for ${LOCK_ROUNDS} rounds.`;
    case 'timeout':
      return 'Time is up.';
    case 'victory':
      return `${boss.name} is defeated.`;
    case 'defeat':
      return 'You are out of health.';
  }
}

export type EventTone = 'good' | 'bad' | 'neutral';

export function eventTone(event: BattleEvent): EventTone {
  switch (event.type) {
    case 'strike':
    case 'guard-up':
    case 'heal':
    case 'blocked':
    case 'cured':
    case 'victory':
      return 'good';
    case 'counter':
    case 'heavy':
    case 'poisoned':
    case 'poison-tick':
    case 'stunned':
    case 'locked':
    case 'timeout':
    case 'defeat':
      return 'bad';
    case 'phase2':
      return 'neutral';
  }
}

/** Health lost by the learner in a round, and gained, for the little “−12” beside the bar. */
export function playerDelta(events: readonly BattleEvent[]): number {
  return events.reduce((sum, e) => {
    if (e.type === 'counter' || e.type === 'heavy' || e.type === 'poison-tick') return sum - e.damage;
    if (e.type === 'heal') return sum + e.amount;
    return sum;
  }, 0);
}

export function bossDamage(events: readonly BattleEvent[]): number {
  return events.reduce((sum, e) => (e.type === 'strike' ? sum + e.damage : sum), 0);
}
