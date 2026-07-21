/**
 * S11 cross-set corpus lint — the counterpart to lint.ts's per-set warnings.
 * lintAuthoredContent(content: AuthoredContent) (lint.ts:44) only ever sees
 * one set at a time, so cross-set near-duplication (the dominant failure mode
 * once a corpus exists) is caught by nothing else. lintCorpus fills that gap.
 *
 * Imports only types.ts + text/normalize.ts — never validate.ts, adapter.ts,
 * the engine, or the hash (component-boundary rule, architecture doc §7).
 * Reuses tokenSetSimilarity + canonicalizeForMatch at the same 0.8 threshold
 * lint.ts uses, so "near-duplicate" means the same thing everywhere.
 */

import { canonicalizeForMatch } from '../../../domain/igcse/text/normalize';
import { tokenSetSimilarity } from './lint';
import type { AuthoredQuestionSet, TargetStructure } from './types';
import type { TimeFrame } from '../../../domain/igcse/evidence/types';

export interface CorpusLintIssue {
  code: string;
  message: string;
  setId: string;
  path: string;
}

export interface CorpusCoverageDiagnostic {
  code: string;
  message: string;
  value: number | string;
}

export interface CorpusLintReport {
  issues: CorpusLintIssue[];
  coverage: CorpusCoverageDiagnostic[];
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;
const OVERUSED_STEM_THRESHOLD = 3; // a stem appearing in > N sets is corpus-overused

interface TextItem {
  setId: string;
  path: string;
  text: string;
}

function rolePlayTextItems(sets: AuthoredQuestionSet[]): TextItem[] {
  const items: TextItem[] = [];
  for (const set of sets) {
    set.content.rolePlay.tasks.forEach((t, i) => {
      items.push({ setId: set.questionSetId, path: `rolePlay.tasks[${i}]`, text: t.mainText });
    });
  }
  return items;
}

function mainTextItems(sets: AuthoredQuestionSet[]): TextItem[] {
  const items: TextItem[] = [];
  for (const set of sets) {
    for (const [topicPath, topic] of [
      ['topic1', set.content.topic1],
      ['topic2', set.content.topic2],
    ] as const) {
      topic.questions.forEach((q, i) => {
        items.push({ setId: set.questionSetId, path: `${topicPath}.questions[${i}].mainText`, text: q.mainText });
      });
    }
  }
  return items;
}

function alternativeTextItems(sets: AuthoredQuestionSet[]): TextItem[] {
  const items: TextItem[] = [];
  for (const set of sets) {
    for (const [topicPath, topic] of [
      ['topic1', set.content.topic1],
      ['topic2', set.content.topic2],
    ] as const) {
      topic.questions.forEach((q, i) => {
        q.alternativeTexts.forEach((alt, j) => {
          items.push({ setId: set.questionSetId, path: `${topicPath}.questions[${i}].alternativeTexts[${j}]`, text: alt });
        });
      });
    }
  }
  return items;
}

function furtherQuestionTextItems(sets: AuthoredQuestionSet[]): TextItem[] {
  const items: TextItem[] = [];
  for (const set of sets) {
    for (const topicPath of ['topic1', 'topic2'] as const) {
      const fq = set.content[topicPath].furtherQuestions;
      items.push({ setId: set.questionSetId, path: `${topicPath}.furtherQuestions[0]`, text: fq[0] });
      items.push({ setId: set.questionSetId, path: `${topicPath}.furtherQuestions[1]`, text: fq[1] });
    }
  }
  return items;
}

/** Cross-set pairwise near-duplicate check within one text pool, skipping pairs from the same set. */
function crossSetDuplicates(items: TextItem[], code: string): CorpusLintIssue[] {
  const issues: CorpusLintIssue[] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (items[i].setId === items[j].setId) continue;
      const sim = tokenSetSimilarity(items[i].text, items[j].text);
      if (sim >= DUPLICATE_SIMILARITY_THRESHOLD) {
        issues.push({
          code,
          message: `${items[j].setId}${items[j].path} is near-duplicate of ${items[i].setId}${items[i].path} (similarity ${sim.toFixed(2)})`,
          setId: items[j].setId,
          path: items[j].path,
        });
      }
    }
  }
  return issues;
}

function rolePlayNearDuplicates(sets: AuthoredQuestionSet[]): CorpusLintIssue[] {
  const issues: CorpusLintIssue[] = [];
  const titles = sets.map((s) => ({ setId: s.questionSetId, path: 'rolePlay.title', text: s.content.rolePlay.title }));
  issues.push(...crossSetDuplicates(titles, 'cross-set-duplicate-role-play'));
  issues.push(...crossSetDuplicates(rolePlayTextItems(sets), 'cross-set-duplicate-role-play'));
  return issues;
}

/** A prompt stem (first two canonicalized tokens) used across more than N sets. */
function overusedStems(items: TextItem[]): CorpusLintIssue[] {
  const stemToSetIds = new Map<string, Set<string>>();
  const stemExample = new Map<string, string>();
  for (const item of items) {
    const stem = canonicalizeForMatch(item.text).split(' ').slice(0, 2).join(' ');
    if (!stem) continue;
    if (!stemToSetIds.has(stem)) stemToSetIds.set(stem, new Set());
    stemToSetIds.get(stem)!.add(item.setId);
    if (!stemExample.has(stem)) stemExample.set(stem, item.text);
  }
  const issues: CorpusLintIssue[] = [];
  for (const [stem, setIds] of stemToSetIds) {
    if (setIds.size > OVERUSED_STEM_THRESHOLD) {
      issues.push({
        code: 'corpus-overused-stem',
        message: `prompt stem "${stem}" (e.g. "${stemExample.get(stem)}") appears in ${setIds.size} sets`,
        setId: [...setIds].sort().join(','),
        path: 'corpus',
      });
    }
  }
  return issues;
}

/** Cross-set check: an authored mainText/alternative recycled verbatim (or near-verbatim) from the legacy app question bank. */
function legacyBankOverlap(sets: AuthoredQuestionSet[], legacyTexts: readonly string[]): CorpusLintIssue[] {
  const issues: CorpusLintIssue[] = [];
  const legacyItems: TextItem[] = legacyTexts.map((text, i) => ({ setId: 'legacy', path: `questions.ts[${i}]`, text }));
  const authored = [...mainTextItems(sets), ...alternativeTextItems(sets)];
  for (const a of authored) {
    for (const l of legacyItems) {
      const sim = tokenSetSimilarity(a.text, l.text);
      if (sim >= DUPLICATE_SIMILARITY_THRESHOLD) {
        issues.push({
          code: 'legacy-bank-overlap',
          message: `${a.setId}${a.path} is near-duplicate of legacy src/data/questions.ts entry "${l.text}" (similarity ${sim.toFixed(2)})`,
          setId: a.setId,
          path: a.path,
        });
      }
    }
  }
  return issues;
}

function coverageDiagnostics(sets: AuthoredQuestionSet[]): CorpusCoverageDiagnostic[] {
  const diagnostics: CorpusCoverageDiagnostic[] = [];

  const pairCounts = new Map<string, number>();
  const rolePlayAreaCounts = new Map<string, number>();
  const topicSlotCounts = new Map<string, number>();
  const structureSetIds = new Map<TargetStructure, Set<string>>();
  const conditionalTopicCount = { value: 0 };
  const difficultyCounts = new Map<string, number>();

  for (const set of sets) {
    const areas = [set.content.topic1.topicArea, set.content.topic2.topicArea].sort();
    const pairKey = areas.join('+');
    pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);

    const rpArea = set.content.rolePlay.topicArea;
    rolePlayAreaCounts.set(rpArea, (rolePlayAreaCounts.get(rpArea) ?? 0) + 1);

    for (const topicPath of ['topic1', 'topic2'] as const) {
      const topic = set.content[topicPath];
      topicSlotCounts.set(topic.topicArea, (topicSlotCounts.get(topic.topicArea) ?? 0) + 1);

      const frames = new Set<TimeFrame | undefined>(topic.questions.map((q) => q.expectedTimeFrame));
      if (frames.has('conditional' as TimeFrame)) conditionalTopicCount.value += 1;

      for (const q of topic.questions) {
        if (q.difficulty) difficultyCounts.set(q.difficulty, (difficultyCounts.get(q.difficulty) ?? 0) + 1);
        for (const s of q.targetStructures ?? []) {
          if (!structureSetIds.has(s)) structureSetIds.set(s, new Set());
          structureSetIds.get(s)!.add(set.questionSetId);
        }
      }
    }
  }

  for (const [pair, count] of [...pairCounts.entries()].sort()) {
    diagnostics.push({ code: 'corpus-pair-coverage', message: `topic-area pair "${pair}" appears in N sets`, value: `${pair}:${count}` });
  }
  for (const [area, count] of [...rolePlayAreaCounts.entries()].sort()) {
    diagnostics.push({ code: 'corpus-roleplay-area-coverage', message: `role-play area "${area}" count`, value: `${area}:${count}` });
  }
  for (const [area, count] of [...topicSlotCounts.entries()].sort()) {
    diagnostics.push({ code: 'corpus-topic-slot-coverage', message: `topic slot area "${area}" count`, value: `${area}:${count}` });
  }
  for (const [structure, setIds] of [...structureSetIds.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    diagnostics.push({ code: 'corpus-structure-coverage', message: `targetStructure "${structure}" appears in N sets`, value: `${structure}:${setIds.size}` });
  }
  diagnostics.push({ code: 'corpus-conditional-topic-count', message: 'topics exercising conditional expectedTimeFrame', value: conditionalTopicCount.value });
  for (const [difficulty, count] of [...difficultyCounts.entries()].sort()) {
    diagnostics.push({ code: 'corpus-difficulty-coverage', message: `difficulty "${difficulty}" question count`, value: `${difficulty}:${count}` });
  }

  return diagnostics;
}

/**
 * Lints an entire corpus of authored sets for cross-set problems the
 * per-set lint cannot see. Deterministic; no LLM heuristics. Never throws —
 * issues + coverage info only, same never-blocking spirit as lint.ts.
 */
export function lintCorpus(sets: AuthoredQuestionSet[], legacyBankTexts: readonly string[] = []): CorpusLintReport {
  const issues: CorpusLintIssue[] = [
    ...crossSetDuplicates(mainTextItems(sets), 'cross-set-duplicate-main-text'),
    ...crossSetDuplicates(alternativeTextItems(sets), 'cross-set-duplicate-alternative'),
    ...crossSetDuplicates(furtherQuestionTextItems(sets), 'cross-set-duplicate-further-question'),
    ...rolePlayNearDuplicates(sets),
    ...overusedStems(mainTextItems(sets)),
  ];
  if (legacyBankTexts.length > 0) {
    issues.push(...legacyBankOverlap(sets, legacyBankTexts));
  }

  return { issues, coverage: coverageDiagnostics(sets) };
}
