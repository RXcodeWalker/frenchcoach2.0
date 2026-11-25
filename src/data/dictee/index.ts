import { SENTENCES } from './sentences';
import { WORDS } from './words';
import type { DicteeFormat, DicteeItem, DicteeLevel } from './types';

export * from './types';

/** Every Dictée line, words then sentences. */
export const DICTEE_ITEMS: readonly DicteeItem[] = [...WORDS, ...SENTENCES];

const BY_ID: ReadonlyMap<string, DicteeItem> = new Map(DICTEE_ITEMS.map(i => [i.id, i]));

export function getDicteeItem(id: string): DicteeItem | undefined {
  return BY_ID.get(id);
}

export function itemsFor(format: DicteeFormat, level: DicteeLevel): DicteeItem[] {
  return DICTEE_ITEMS.filter(i => i.format === format && i.level === level);
}

/** The full set of spellings that count as right for a line. */
export function acceptedSpellings(item: DicteeItem): string[] {
  return [item.fr, ...(item.accept ?? [])];
}
