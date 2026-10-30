// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../services/persistence/storage';
import { readBossRecords, recordFight } from '../bossStore';

const win = (stars: 1 | 2 | 3, rounds = 8, maxCombo = 5) => ({ won: true, stars, rounds, maxCombo });
const loss = (maxCombo = 2) => ({ won: false, stars: 0 as const, rounds: 6, maxCombo });
const at = () => '2026-10-30T10:00:00.000Z';

describe('bossStore', () => {
  beforeEach(() => localStorage.clear());

  it('reads as empty when nothing is stored', () => {
    expect(readBossRecords()).toEqual({ version: 1, bosses: {} });
  });

  it('ignores a value of another version or shape', () => {
    localStorage.setItem(STORAGE_KEYS.bossBattle, JSON.stringify({ version: 2, bosses: { gender: { stars: 3 } } }));
    expect(readBossRecords()).toEqual({ version: 1, bosses: {} });
    localStorage.setItem(STORAGE_KEYS.bossBattle, '{not json');
    expect(readBossRecords()).toEqual({ version: 1, bosses: {} });
    localStorage.setItem(STORAGE_KEYS.bossBattle, JSON.stringify({ version: 1, bosses: { gender: { stars: 9 }, past_tense: null } }));
    expect(readBossRecords()).toEqual({ version: 1, bosses: {} });
  });

  it('records a first win', () => {
    const records = recordFight('gender', win(2, 9, 6), at);
    expect(records.bosses.gender).toEqual({ fights: 1, wins: 1, stars: 2, bestCombo: 6, fastestWin: 9, updatedAt: at() });
    expect(readBossRecords()).toEqual(records);
  });

  it('keeps the best of every fight and never lowers stars', () => {
    recordFight('gender', win(3, 9, 6), at);
    recordFight('gender', loss(9), at);
    const records = recordFight('gender', win(1, 7, 3), at);
    expect(records.bosses.gender).toMatchObject({ fights: 3, wins: 2, stars: 3, bestCombo: 9, fastestWin: 7 });
  });

  it('a loss counts as a fight but not a win, and has no fastest win', () => {
    const records = recordFight('future', loss(), at);
    expect(records.bosses.future).toMatchObject({ fights: 1, wins: 0, stars: 0, fastestWin: null });
  });

  it('keeps each boss separate', () => {
    recordFight('gender', win(3), at);
    const records = recordFight('negation', win(1), at);
    expect(Object.keys(records.bosses).sort()).toEqual(['gender', 'negation']);
  });

  it('keeps the Gauntlet’s record beside the bosses’', () => {
    recordFight('gender', win(2), at);
    const records = recordFight('gauntlet', win(1, 12, 5), at);
    expect(Object.keys(records.bosses).sort()).toEqual(['gauntlet', 'gender']);
    expect(readBossRecords().bosses.gauntlet).toMatchObject({ fights: 1, wins: 1, stars: 1, fastestWin: 12 });
  });

  it('writes under the identity scope like other per-account data', () => {
    recordFight('gender', win(1), at);
    expect(Object.keys(localStorage).every((k) => k.startsWith(STORAGE_KEYS.bossBattle))).toBe(true);
  });
});
