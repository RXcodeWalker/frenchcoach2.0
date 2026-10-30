/**
 * Shop UI rules (Design System v2): colour only from role tokens, no text under
 * 12px, only the eight named motions (no hover scale, looping pulses, glows,
 * gradients, confetti or shake). Covers the Shop screen, its feature folder and
 * the shared components that only the Shop uses.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..', '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

const SHOP_FILES = [
  ...files(join(SRC, 'features', 'shop')),
  join(SRC, 'screens', 'Shop.tsx'),
  join(SRC, 'components', 'ui', 'GemBalance.tsx'),
  join(SRC, 'components', 'ui', 'TransactionList.tsx'),
  join(SRC, 'components', 'ui', 'RarityRing.tsx'),
  join(SRC, 'components', 'ui', 'CosmeticPreview.tsx'),
  join(SRC, 'services', 'shop', 'rarity.ts'),
];

const BANNED: Array<[string, RegExp]> = [
  ['text under 12px', /text-\[(?:\d|1[01])(?:\.\d+)?px\]/],
  ['hover motion', /whileHover|hover:scale|whileTap/],
  ['looping pulse', /animate-(?:pulse|ping|bounce|shake)|repeat:\s*Infinity/],
  ['gradient', /bg-gradient-|from-\w+-\d{3}/],
  ['glow or blur', /shadow-\[[^\]]*rgba|blur-\d|backdrop-blur/],
  ['confetti', /confetti/i],
  ['layout-animated flight', /layoutId/],
  ['raw palette colour', /(?:text|bg|border|ring)-(?:violet|emerald|rose|amber|slate|navy|indigo|sky|red|green|blue|yellow|orange)-\d{2,3}/],
  ['white-alpha chrome', /(?:bg|border|text)-white(?:\/\d+)?\b/],
  ['hex colour', /#[0-9a-fA-F]{6}\b/],
];

describe('Shop design rules', () => {
  const sources = SHOP_FILES.map((f) => [f, readFileSync(f, 'utf8')] as const);

  it('scans the Shop screen and its folder', () => {
    expect(sources.some(([f]) => f.endsWith('Shop.tsx'))).toBe(true);
    expect(sources.some(([f]) => f.endsWith('ShopItemCard.tsx'))).toBe(true);
  });

  it.each(BANNED)('no %s', (_label, re) => {
    expect(sources.filter(([, text]) => re.test(text)).map(([f]) => f)).toEqual([]);
  });
});
