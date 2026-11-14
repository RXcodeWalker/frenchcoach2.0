/**
 * The Daily News bank — every edition, in authoring order (docs/systems/daily-news.md §1).
 * Which one runs on a given day is rotation.ts's job.
 */
import { WEEK1 } from './editions/week1';
import { WEEK2 } from './editions/week2';
import { WEEK3 } from './editions/week3';
import { WEEK4 } from './editions/week4';
import type { NewsEdition } from './types';

export const NEWS_EDITIONS: readonly NewsEdition[] = [...WEEK1, ...WEEK2, ...WEEK3, ...WEEK4];

export function findEdition(id: string): NewsEdition | undefined {
  return NEWS_EDITIONS.find(e => e.id === id);
}
