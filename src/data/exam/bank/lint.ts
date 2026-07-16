/**
 * S11 deterministic authoring lint — content-quality warnings, separate from
 * structural validation (validate.ts). Pure and deterministic; no LLM in this
 * loop. Uses the same canonicalizeForMatch/normalizeForMatch the STT matcher
 * and L3 quote-verification use, so accent/case/quote differences don't hide
 * duplicates (architecture doc §3.4).
 *
 * Imports only types.ts + text/normalize.ts — never validate.ts, adapter.ts,
 * the engine, or the hash (component-boundary rule, §7).
 */

import { canonicalizeForMatch } from '../../../domain/igcse/text/normalize';
import type { AuthoredContent, AuthoredQuestion } from './types';

export interface LintIssue {
  code: string;
  message: string;
  path: string;
}

function allQuestions(content: AuthoredContent): { path: string; q: AuthoredQuestion }[] {
  return [
    ...content.rolePlay.tasks.map((q, i) => ({ path: `rolePlay.tasks[${i}]`, q })),
    ...content.topic1.questions.map((q, i) => ({ path: `topic1.questions[${i}]`, q })),
    ...content.topic2.questions.map((q, i) => ({ path: `topic2.questions[${i}]`, q })),
  ];
}

/** Token-set similarity over the shared match-normalization; 1.0 = identical token sets. */
function tokenSetSimilarity(a: string, b: string): number {
  const ta = new Set(canonicalizeForMatch(a).split(' ').filter(Boolean));
  const tb = new Set(canonicalizeForMatch(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return ta.size === tb.size ? 1 : 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection += 1;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;
const WEAK_ALTERNATIVE_SIMILARITY_THRESHOLD = 0.8;

/** Deterministic content-quality lint over one authored set. Never blocks — see validate.ts severities. */
export function lintAuthoredContent(content: AuthoredContent): LintIssue[] {
  const issues: LintIssue[] = [];
  const items = allQuestions(content);

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const sim = tokenSetSimilarity(items[i].q.mainText, items[j].q.mainText);
      if (sim >= DUPLICATE_SIMILARITY_THRESHOLD) {
        issues.push({
          code: 'duplicate-main-text',
          message: `mainText at ${items[i].path} is near-duplicate of ${items[j].path} (similarity ${sim.toFixed(2)})`,
          path: items[j].path,
        });
      }
    }
  }

  for (const { path, q } of items) {
    for (let i = 0; i < q.alternativeTexts.length; i += 1) {
      const sim = tokenSetSimilarity(q.mainText, q.alternativeTexts[i]);
      if (sim >= WEAK_ALTERNATIVE_SIMILARITY_THRESHOLD) {
        issues.push({
          code: 'weak-alternative',
          message: `alternativeTexts[${i}] at ${path} too similar to its own mainText (similarity ${sim.toFixed(2)})`,
          path: `${path}.alternativeTexts[${i}]`,
        });
      }
    }
  }

  for (const [topicPath, topic] of [
    ['topic1', content.topic1],
    ['topic2', content.topic2],
  ] as const) {
    const frames = new Set(topic.questions.map((q) => q.expectedTimeFrame).filter(Boolean));
    if (!frames.has('past') || !frames.has('future')) {
      issues.push({
        code: 'time-frame-monotony',
        message: `${topicPath} does not exercise both a past and a future time frame across its 5 questions`,
        path: topicPath,
      });
    }

    const stems = topic.questions.map((q) => canonicalizeForMatch(q.mainText).split(' ').slice(0, 2).join(' '));
    const stemCounts = new Map<string, number>();
    for (const stem of stems) stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
    for (const [stem, count] of stemCounts) {
      if (count >= 3) {
        issues.push({
          code: 'low-lexical-variation',
          message: `${topicPath} repeats the prompt stem "${stem}" in ${count} of its 5 questions`,
          path: topicPath,
        });
      }
    }
  }

  return issues;
}
