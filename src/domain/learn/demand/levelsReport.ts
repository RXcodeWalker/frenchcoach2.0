// ── Question-level report — behind `npm run learn:levels`. Pure. ─────────────────
//
// Which level (A1–B2) each Learn question derives to, per topic, and which
// questions the describe floor moved. Read-only: it never writes a tag.

import type { DemandLevel, QuestionDemands } from './types';
import { demandScoreToLevel, deriveDemandScore, deriveDemandScoreBeforeFloor } from './deriveDemandLevel';

export const LEVELS: readonly DemandLevel[] = ['A1', 'A2', 'B1', 'B2'];

export interface LevelsReportInput {
  id: string;
  topicKey: string;
  demands?: QuestionDemands;
}

export interface MovedByFloor {
  id: string;
  topicKey: string;
  from: DemandLevel;
  to: DemandLevel;
  scoreBefore: number;
  scoreAfter: number;
}

export interface LevelsReport {
  total: number;
  withDemands: number;
  withoutDemands: string[];
  byLevel: Record<DemandLevel, number>;
  /** The distribution before the describe floor, for comparison. */
  byLevelBeforeFloor: Record<DemandLevel, number>;
  byTopic: Record<string, Record<DemandLevel, number>>;
  movedByFloor: MovedByFloor[];
  /** Stretch-eligible (non-`inferred`) questions at B1 or above, per topic. */
  trustedStretchByTopic: Record<string, number>;
}

function emptyCounts(): Record<DemandLevel, number> {
  return { A1: 0, A2: 0, B1: 0, B2: 0 };
}

export function buildLevelsReport(questions: readonly LevelsReportInput[]): LevelsReport {
  const report: LevelsReport = {
    total: questions.length,
    withDemands: 0,
    withoutDemands: [],
    byLevel: emptyCounts(),
    byLevelBeforeFloor: emptyCounts(),
    byTopic: {},
    movedByFloor: [],
    trustedStretchByTopic: {},
  };

  for (const q of questions) {
    if (!q.demands) {
      report.withoutDemands.push(q.id);
      continue;
    }
    report.withDemands += 1;
    const scoreAfter = deriveDemandScore(q.demands);
    const scoreBefore = deriveDemandScoreBeforeFloor(q.demands);
    const to = demandScoreToLevel(scoreAfter);
    const from = demandScoreToLevel(scoreBefore);

    report.byLevel[to] += 1;
    report.byLevelBeforeFloor[from] += 1;
    (report.byTopic[q.topicKey] ??= emptyCounts())[to] += 1;
    if (from !== to) report.movedByFloor.push({ id: q.id, topicKey: q.topicKey, from, to, scoreBefore, scoreAfter });
    if (q.demands.provenance !== 'inferred' && (to === 'B1' || to === 'B2')) {
      report.trustedStretchByTopic[q.topicKey] = (report.trustedStretchByTopic[q.topicKey] ?? 0) + 1;
    }
  }
  return report;
}

export function formatLevelsReport(r: LevelsReport): string {
  const row = (c: Record<DemandLevel, number>) => LEVELS.map((l) => `${l}=${String(c[l]).padStart(3)}`).join('  ');
  const lines: string[] = [];
  lines.push(`=== Learn question levels — ${r.withDemands}/${r.total} questions carry demands ===`, '');
  lines.push(`Now:           ${row(r.byLevel)}`);
  lines.push(`Before floor:  ${row(r.byLevelBeforeFloor)}`, '');
  lines.push('Per topic:');
  for (const topic of Object.keys(r.byTopic).sort()) {
    const trusted = r.trustedStretchByTopic[topic] ?? 0;
    lines.push(`  ${topic.padEnd(14)} ${row(r.byTopic[topic])}   non-inferred B1+: ${trusted}`);
  }
  lines.push('', `Moved by the describe floor (past/future describe -> at least A2): ${r.movedByFloor.length}`);
  for (const m of r.movedByFloor) {
    lines.push(`  ${m.id.padEnd(10)} ${m.topicKey.padEnd(12)} ${m.from} -> ${m.to}  (${m.scoreBefore.toFixed(2)} -> ${m.scoreAfter.toFixed(2)})`);
  }
  if (r.withoutDemands.length > 0) {
    lines.push('', `${r.withoutDemands.length} question(s) without demands: ${r.withoutDemands.join(', ')}`);
  }
  return lines.join('\n');
}
