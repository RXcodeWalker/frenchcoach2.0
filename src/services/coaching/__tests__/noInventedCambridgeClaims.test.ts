// Phase 3 Batch C: the offline coach and minimal-response copy must not assert
// Cambridge facts the Teachers' Notes don't state (tier labels, band names,
// "mark booster", "costs/earns marks" claims). Banned-phrase scan, sibling of
// noInventedScoring.test.ts.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const FILES = [
  'src/services/coaching/coachService.ts',
  'src/services/coaching/responseTier.ts',
  'src/features/feedback/components/MinimalResponseCard.tsx',
];

const BANNED: [string, RegExp][] = [
  ['"Tier 1" accuracy claim', /Tier 1 accuracy/],
  ['invented band label', /Core-Secure|Core-Developing|Extended-High|Extended-Mid|Extended-band|Extended band|Foundation-(Secure|Developing)|Core-to-Extended/],
  ['Extended/Core performance claim', /Extended from Core|Foundation level|including Foundation/],
  ['"mark booster"', /mark booster/i],
  ['invented band consequence', /(Language|Fluency|Communication) band\b/],
  ['"earns marks"', /\bearns? (Communication or Language )?marks\b/],
  ['"cannot earn ... marks"', /cannot earn [A-Za-z ]*marks/],
  ['"marks reward"', /marks (reward|rewards)\b/],
  ['"boosts your Language score"', /boosts your Language score/],
];

describe('no invented Cambridge claims in coach / minimal-response copy', () => {
  for (const file of FILES) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    for (const [name, re] of BANNED) {
      it(`${file} has no ${name}`, () => {
        expect(src).not.toMatch(re);
      });
    }
  }
});
