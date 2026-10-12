/**
 * Version-drift guard for the sound-alike tables and the respeller. Hashes the
 * rendered tables and word lists plus the output on a fixed probe set, so it
 * fires when observable behaviour changes — a list entry, a liaison flag or a
 * rule — not on comments or refactors.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CLOSED_CLASSES, PATTERN_CLASSES, categoryAClass } from '../homophones/classes';
import * as lexicon from '../homophones/lexicon';
import { NEAR_PAIRS } from '../homophones/nearPairs';
import { respell } from '../homophones/respell';
import { HOMOPHONE_TABLE_VERSION } from '../homophones/version';
import { RESPELLED, UNCHANGED } from './homophones.fixtures';

const HOMOPHONE_TABLE_HASH = 'd7e29773a4b945abd9d02ee25ed7c41e27f7b9a53a2b8622c46ecd05415b1561';

/** Word pairs whose classification is pinned (both directions are checked by the class tests). */
const PROBE_PAIRS: [string, string][] = [
  ['il', 'ils'], ['elle', 'elles'], ['mange', 'mangent'], ['mangé', 'mangeait'], ['manger', 'mangez'],
  ['chat', 'chats'], ['ami', 'amies'], ['fais', 'fait'], ['et', 'est'], ['a', 'à'], ['ou', 'où'],
  ['ces', "c'est"], ['on', 'ont'], ['son', 'sont'], ['tout', 'tous'], ['mes', 'mais'], ['un', 'en'],
  ['le', 'les'], ['comme', 'comment'], ['cher', 'chez'], ['fil', 'fils'], ['eu', 'eux'], ['je', "j'ai"],
  ['petit', 'petite'], ['vend', 'vendent'], ['ma', 'mat'], ['an', 'ans'], ['parent', 'pare'],
];

function plain(value: unknown): unknown {
  if (value instanceof Set) return [...value].sort();
  if (value instanceof Map) return [...value.entries()].sort();
  if (typeof value === 'function') return undefined;
  return value;
}

function fingerprint(): unknown {
  const lists = Object.fromEntries(
    Object.entries(lexicon)
      .filter(([, v]) => typeof v !== 'function')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, plain(v)]),
  );
  return {
    closed: CLOSED_CLASSES.map((c) => [c.id, c.forms, c.liaisonSensitive]),
    patterns: PATTERN_CLASSES.map((c) => [c.id, c.liaisonSensitive, c.exclusions]),
    near: NEAR_PAIRS.map((p) => [p.a, p.b]),
    lexicon: lists,
    probes: PROBE_PAIRS.map(([a, b]) => categoryAClass(a, b)?.id ?? null),
    respelled: [...RESPELLED.map(([h]) => h), ...UNCHANGED].map((h) => respell(h)),
  };
}

describe('homophone tables version pin', () => {
  it('rendered tables + respell output match HOMOPHONE_TABLE_HASH', () => {
    const actual = createHash('sha256').update(JSON.stringify(fingerprint())).digest('hex');
    expect(
      actual,
      `homophone tables or respeller changed — bump HOMOPHONE_TABLE_VERSION (currently "${HOMOPHONE_TABLE_VERSION}") and update HOMOPHONE_TABLE_HASH together in this commit`,
    ).toBe(HOMOPHONE_TABLE_HASH);
  });
});
