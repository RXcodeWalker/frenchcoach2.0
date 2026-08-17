/**
 * Deterministic content-quality lint over one LearnDemandsEntry, against its
 * source question text — warnings only, never blocking (see validate.ts
 * severities, docs §12). Mirrors src/data/exam/bank/lint.ts's shape but is
 * independent code: src/domain/learn/ must not import from
 * src/domain/igcse/ (CLAUDE.md hard constraint #1).
 */

import { hasStructureCue, hasTimeFrameCue } from './textCues';
import type { LearnDemandsEntry } from './types';

export interface LintIssue {
  code: string;
  message: string;
  path: string;
}

const BANNED_VAGUE_PHRASES = [
  'something about it',
  'talks about it',
  'gives some information',
  'says something',
];

/**
 * §12 warn rules that need only the entry, plus (when available) the
 * question's own French wording. questionText is optional: a caller that
 * cannot resolve it (e.g. no question-bank lookup on hand) simply skips the
 * two cue-based rules rather than failing.
 */
export function lintLearnDemandsEntry(entry: LearnDemandsEntry, questionText?: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const path = entry.questionId;
  const { demands } = entry;

  const onlyAboveBaselineSignalIsLexical =
    demands.lexicalReach === 'abstract' &&
    !demands.timeFrames.includes('conditional') &&
    demands.timeFrames.length < 3 &&
    demands.responseLoad !== 'extended' &&
    demands.structures.length === 0;
  if (onlyAboveBaselineSignalIsLexical) {
    issues.push({
      code: 'level-not-carried-by-vocabulary',
      message: `${path}: lexicalReach="abstract" is the only above-baseline signal — level must come from cognitiveDemand/timeFrames/structures, not vocabulary`,
      path,
    });
  }

  if (questionText !== undefined) {
    for (const frame of demands.timeFrames) {
      if (!hasTimeFrameCue(questionText, frame)) {
        issues.push({
          code: 'time-frame-not-cued',
          message: `${path}: tagged timeFrame "${frame}" has no recognisable cue word in the question text`,
          path,
        });
      }
    }

    for (const structure of demands.structures) {
      if (!hasStructureCue(questionText, structure)) {
        issues.push({
          code: 'structure-not-elicited',
          message: `${path}: tagged structure "${structure}" has no matching pattern in the question text`,
          path,
        });
      }
    }
  }

  const normalizedAnswer = demands.sufficientAnswer.trim().toLowerCase();
  if (BANNED_VAGUE_PHRASES.some((phrase) => normalizedAnswer.includes(phrase))) {
    issues.push({
      code: 'sufficient-answer-too-vague',
      message: `${path}: sufficientAnswer uses a banned vague phrase`,
      path,
    });
  }

  return issues;
}

/** §12 warn rule that needs the whole topic file: topic-demand-monotony. */
export function lintTopicDemandCoverage(topicKey: string, entries: LearnDemandsEntry[]): LintIssue[] {
  const distinctDemands = new Set(entries.map((e) => e.demands.cognitiveDemand));
  if (distinctDemands.size < 3) {
    return [
      {
        code: 'topic-demand-monotony',
        message: `topic "${topicKey}" covers only ${distinctDemands.size} distinct cognitiveDemand value(s) across its questions (< 3)`,
        path: topicKey,
      },
    ];
  }
  return [];
}
