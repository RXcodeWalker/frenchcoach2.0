/**
 * The Daily News bank — every edition, in authoring order (docs/systems/daily-news.md §1).
 *
 * A story (editions/*.ts: what Henri reads) is joined here with its show
 * segments and links (segments/week*.ts and segments/reporter*.ts, daily-news §7). Which edition runs on a
 * given day is rotation.ts's job; bank order is rotation order.
 */
import { WEEK1 } from './editions/week1';
import { WEEK2 } from './editions/week2';
import { WEEK3 } from './editions/week3';
import { WEEK4 } from './editions/week4';
import { SEGMENTS_WEEK1 } from './segments/week1';
import { SEGMENTS_WEEK2 } from './segments/week2';
import { SEGMENTS_WEEK3 } from './segments/week3';
import { SEGMENTS_WEEK4 } from './segments/week4';
import { REPORTER_WEEK1 } from './segments/reporter1';
import { REPORTER_WEEK2 } from './segments/reporter2';
import { REPORTER_WEEK3 } from './segments/reporter3';
import { REPORTER_WEEK4 } from './segments/reporter4';
import {
  NEWS_LEVELS,
  type NewsEdition,
  type NewsEditionSegments,
  type NewsLevel,
  type NewsLevelId,
  type NewsReporterSegments,
  type NewsStory,
} from './types';

export const NEWS_STORIES: readonly NewsStory[] = [...WEEK1, ...WEEK2, ...WEEK3, ...WEEK4];

export const NEWS_SEGMENTS: Readonly<Record<string, NewsEditionSegments>> = {
  ...SEGMENTS_WEEK1,
  ...SEGMENTS_WEEK2,
  ...SEGMENTS_WEEK3,
  ...SEGMENTS_WEEK4,
};

/** « Le journaliste, c'est toi » and « Et après ? » (daily-news §7), keyed by story id. */
export const NEWS_REPORTER: Readonly<Record<string, NewsReporterSegments>> = {
  ...REPORTER_WEEK1,
  ...REPORTER_WEEK2,
  ...REPORTER_WEEK3,
  ...REPORTER_WEEK4,
};

/** A story with its segments. A story missing either set is left out (the bank lint fails on it). */
function join(story: NewsStory): NewsEdition[] {
  const seg = NEWS_SEGMENTS[story.id];
  const reporter = NEWS_REPORTER[story.id];
  if (!seg || !reporter) return [];
  const levels = {} as Record<NewsLevelId, NewsLevel>;
  for (const id of NEWS_LEVELS) levels[id] = { ...story.levels[id], ...seg.levels[id], ...reporter[id] };
  return [{ ...story, examArea: seg.examArea, learnTopic: seg.learnTopic, levels }];
}

export const NEWS_EDITIONS: readonly NewsEdition[] = NEWS_STORIES.flatMap(join);

export function findEdition(id: string): NewsEdition | undefined {
  return NEWS_EDITIONS.find(e => e.id === id);
}
