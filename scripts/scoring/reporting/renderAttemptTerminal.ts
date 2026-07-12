/**
 * Plain-text pretty printer over EnvelopeView — the fast developer loop
 * (npm run score:inspect -- --format terminal). No deps, no colors library.
 */

import type { CriterionView, EnvelopeView } from './envelopeView';

function renderCriterionLabel(c: CriterionView): string {
  if (c.criterion === 'rolePlayTask') return `Role play — ${c.taskId}`;
  if (c.criterion === 'communication') return 'Communication';
  return 'Quality of Language';
}

function renderCriterion(c: CriterionView): string[] {
  const lines: string[] = [];
  const bandStr = c.band ? ` (band ${c.band.min}-${c.band.max}${c.band.label ? `, "${c.band.label}"` : ''})` : '';
  lines.push(`- ${renderCriterionLabel(c)}: mark ${c.mark}${bandStr} [confidence: ${c.confidence}]`);
  if (c.teacherMark) {
    const delta = c.mark - c.teacherMark.mark;
    lines.push(`    teacher mark: ${c.teacherMark.mark} (delta ${delta >= 0 ? '+' : ''}${delta})`);
    if (c.teacherMark.comment) lines.push(`    teacher comment: ${c.teacherMark.comment}`);
  }
  if (c.topicArea) lines.push(`    topicArea: ${c.topicArea}`);
  if (c.responseLength) lines.push(`    responseLength: ${c.responseLength}`);
  lines.push(`    justification: ${c.justification}`);
  for (const span of c.evidenceSpans) {
    lines.push(`    quote [${span.source}]: "${span.quote}"`);
  }
  return lines;
}

export function renderAttemptTerminal(view: EnvelopeView): string {
  const lines: string[] = [];

  lines.push('='.repeat(72));
  lines.push(`Attempt ${view.attemptId}  (session ${view.sessionId})`);
  lines.push(`Scored at ${view.scoredAt}  |  contentProvenance: ${view.contentProvenance}`);
  lines.push('='.repeat(72));
  lines.push('');

  lines.push('Provenance');
  lines.push(`  LLM: ${view.llm.provider} / ${view.llm.model}`);
  lines.push(
    `  Versions: rubric=${view.versions.rubricVersion} engine=${view.versions.scoringEngineVersion} ` +
      `evidence=${view.versions.evidenceDetectorVersion} prompt=${view.versions.scoringPromptVersion} ` +
      `guardrails=${view.versions.guardrailsVersion}`,
  );
  lines.push(
    `  Transcript confidence: mean=${view.transcriptConfidence.meanWordConfidence.toFixed(3)} ` +
      `lowConfidenceSpanRatio=${view.transcriptConfidence.lowConfidenceSpanRatio.toFixed(3)} ` +
      `(${view.transcriptConfidence.lowConfidenceSpanCount} spans) userCorrected=${view.transcriptConfidence.userCorrected}`,
  );
  lines.push('');

  lines.push(`Guardrail triggers (${view.guardrailTriggers.length})`);
  if (view.guardrailTriggers.length === 0) {
    lines.push('  none');
  } else {
    for (const trigger of view.guardrailTriggers) lines.push(`  - ${trigger.id}`);
  }
  lines.push('');

  lines.push(`Marks (total ${view.total})`);
  for (const c of view.criteria) {
    lines.push(...renderCriterion(c));
  }
  lines.push('');

  if (view.teacherMarkSet) {
    lines.push(`Teacher marks: ${view.teacherMarkSet.markedBy} @ ${view.teacherMarkSet.markedAt}`);
    if (view.teacherMarkSet.pronunciationMovedQol) {
      lines.push(
        `  pronunciationMovedQol: ${view.teacherMarkSet.pronunciationMovedQol.moved}` +
          (view.teacherMarkSet.pronunciationMovedQol.note
            ? ` — ${view.teacherMarkSet.pronunciationMovedQol.note}`
            : ''),
      );
    }
    lines.push('');
  }

  lines.push('Transcript');
  for (const group of view.evidenceGroups) {
    lines.push(`  [${group.part}:${group.questionOrTaskId}] ${group.prompt}`);
    lines.push(`    -> ${group.candidateResponse}`);
    const meta: string[] = [];
    if (group.wordCount !== undefined) meta.push(`words=${group.wordCount}`);
    if (group.fillerDensity !== undefined) meta.push(`fillerDensity=${group.fillerDensity.toFixed(3)}`);
    if (group.timeFrameAlignment !== undefined) meta.push(`timeFrame=${group.timeFrameAlignment}`);
    if (meta.length > 0) lines.push(`    (${meta.join(', ')})`);
  }

  return lines.join('\n') + '\n';
}
