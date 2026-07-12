/**
 * Self-contained template-string HTML renderer over EnvelopeView — no
 * framework, inline CSS, no new deps. Designed for a non-developer (teacher)
 * to double-click and read: "reproduce by hand why the mark was awarded."
 */

import type { CriterionView, EnvelopeView } from './envelopeView';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function criterionLabel(c: CriterionView): string {
  if (c.criterion === 'rolePlayTask') return `Role play — ${c.taskId}`;
  if (c.criterion === 'communication') return 'Communication';
  return 'Quality of Language';
}

function renderCriterionCard(c: CriterionView): string {
  const bandStr = c.band
    ? `<span class="band">band ${c.band.min}&ndash;${c.band.max}${c.band.label ? ` &middot; ${escapeHtml(c.band.label)}` : ''}</span>`
    : '';
  const teacherStr = c.teacherMark
    ? (() => {
        const delta = c.mark - c.teacherMark!.mark;
        const deltaClass = delta === 0 ? 'delta-zero' : Math.abs(delta) >= 3 ? 'delta-high' : 'delta-low';
        return `<div class="teacher"><strong>Teacher mark:</strong> ${c.teacherMark.mark}
          <span class="${deltaClass}">(delta ${delta >= 0 ? '+' : ''}${delta})</span>
          ${c.teacherMark.comment ? `<div class="teacher-comment">${escapeHtml(c.teacherMark.comment)}</div>` : ''}
        </div>`;
      })()
    : '';
  const metaBits = [
    c.topicArea ? `topicArea: ${escapeHtml(c.topicArea)}` : null,
    c.responseLength ? `responseLength: ${escapeHtml(c.responseLength)}` : null,
  ].filter((x): x is string => x !== null);

  return `
  <section class="criterion">
    <h3>${escapeHtml(criterionLabel(c))} — mark ${c.mark} ${bandStr}</h3>
    <div class="confidence">confidence: ${escapeHtml(c.confidence)}${metaBits.length ? ` &middot; ${metaBits.join(' &middot; ')}` : ''}</div>
    ${teacherStr}
    <p class="justification">${escapeHtml(c.justification)}</p>
    ${c.evidenceSpans.length > 0 ? `<ul class="quotes">${c.evidenceSpans.map((s) => `<li><span class="source">${escapeHtml(s.source)}</span> &ldquo;${escapeHtml(s.quote)}&rdquo;</li>`).join('')}</ul>` : '<p class="no-evidence">No evidence spans.</p>'}
  </section>`;
}

function renderTranscriptGroup(group: EnvelopeView['evidenceGroups'][number]): string {
  const meta: string[] = [];
  if (group.wordCount !== undefined) meta.push(`words: ${group.wordCount}`);
  if (group.fillerDensity !== undefined) meta.push(`filler density: ${group.fillerDensity.toFixed(3)}`);
  if (group.timeFrameAlignment !== undefined) meta.push(`time frame: ${escapeHtml(group.timeFrameAlignment)}`);

  return `
  <div class="turn">
    <div class="turn-id">${escapeHtml(group.part)}:${escapeHtml(group.questionOrTaskId)}</div>
    <div class="prompt">${escapeHtml(group.prompt)}</div>
    <div class="response">${escapeHtml(group.candidateResponse)}</div>
    ${meta.length > 0 ? `<div class="turn-meta">${meta.join(' &middot; ')}</div>` : ''}
  </div>`;
}

export function renderAttemptHtml(view: EnvelopeView): string {
  const guardrailSection =
    view.guardrailTriggers.length === 0
      ? '<p class="clean">No guardrail triggers.</p>'
      : `<ul class="guardrails">${view.guardrailTriggers.map((t) => `<li>${escapeHtml(t.id)}</li>`).join('')}</ul>`;

  const teacherSection = view.teacherMarkSet
    ? `<section class="teacher-block">
        <h2>Teacher marks</h2>
        <p>${escapeHtml(view.teacherMarkSet.markedBy)} @ ${escapeHtml(view.teacherMarkSet.markedAt)}</p>
        ${
          view.teacherMarkSet.pronunciationMovedQol
            ? `<p>Pronunciation moved QoL: ${view.teacherMarkSet.pronunciationMovedQol.moved}${view.teacherMarkSet.pronunciationMovedQol.note ? ` — ${escapeHtml(view.teacherMarkSet.pronunciationMovedQol.note)}` : ''}</p>`
            : ''
        }
      </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Attempt ${escapeHtml(view.attemptId)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.5; color: #1a1a1a; background: #fff; }
  @media (prefers-color-scheme: dark) { body { color: #e4e4e4; background: #121212; } }
  h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.1rem; margin-top: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
  h3 { font-size: 1rem; margin-bottom: 0.25rem; }
  .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .provenance { font-size: 0.85rem; color: #555; background: #f5f5f5; border-radius: 6px; padding: 0.75rem 1rem; }
  @media (prefers-color-scheme: dark) { .provenance { background: #1e1e1e; color: #aaa; } }
  .provenance div { margin: 0.15rem 0; }
  .criterion { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
  @media (prefers-color-scheme: dark) { .criterion { border-color: #333; } }
  .band { font-weight: normal; color: #666; font-size: 0.85rem; }
  .confidence { font-size: 0.8rem; color: #888; margin-bottom: 0.5rem; }
  .justification { margin: 0.5rem 0; }
  .quotes { list-style: none; padding: 0; margin: 0.5rem 0 0 0; }
  .quotes li { background: #f9f9f4; border-left: 3px solid #b8a45c; padding: 0.4rem 0.6rem; margin: 0.3rem 0; font-style: italic; }
  @media (prefers-color-scheme: dark) { .quotes li { background: #1c1c14; } }
  .source { font-style: normal; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; color: #888; margin-right: 0.5rem; }
  .no-evidence { color: #a33; font-size: 0.85rem; }
  .teacher { margin: 0.5rem 0; padding: 0.5rem; background: #eef4ff; border-radius: 6px; font-size: 0.9rem; }
  @media (prefers-color-scheme: dark) { .teacher { background: #16202e; } }
  .teacher-comment { font-style: italic; margin-top: 0.25rem; }
  .delta-zero { color: #2a7a2a; }
  .delta-low { color: #a67c00; }
  .delta-high { color: #c0392b; font-weight: 600; }
  .guardrails { color: #c0392b; }
  .clean { color: #2a7a2a; }
  .turn { border-bottom: 1px solid #eee; padding: 0.75rem 0; }
  @media (prefers-color-scheme: dark) { .turn { border-color: #2a2a2a; } }
  .turn-id { font-size: 0.75rem; text-transform: uppercase; color: #999; }
  .prompt { font-weight: 600; margin: 0.2rem 0; }
  .response { margin: 0.2rem 0; }
  .turn-meta { font-size: 0.75rem; color: #999; }
  table.overflow-wrap { overflow-x: auto; display: block; }
</style>
</head>
<body>
  <h1>Scored attempt ${escapeHtml(view.attemptId)}</h1>
  <div class="subtitle">Session ${escapeHtml(view.sessionId)} &middot; scored ${escapeHtml(view.scoredAt)} &middot; ${escapeHtml(view.contentProvenance)}</div>

  <div class="provenance">
    <div><strong>LLM:</strong> ${escapeHtml(view.llm.provider)} / ${escapeHtml(view.llm.model)}</div>
    <div><strong>Versions:</strong> rubric=${escapeHtml(view.versions.rubricVersion)}, engine=${escapeHtml(view.versions.scoringEngineVersion)}, evidence=${escapeHtml(view.versions.evidenceDetectorVersion)}, prompt=${escapeHtml(view.versions.scoringPromptVersion)}, guardrails=${escapeHtml(view.versions.guardrailsVersion)}</div>
    <div><strong>Transcript confidence:</strong> mean ${view.transcriptConfidence.meanWordConfidence.toFixed(3)}, low-confidence span ratio ${view.transcriptConfidence.lowConfidenceSpanRatio.toFixed(3)} (${view.transcriptConfidence.lowConfidenceSpanCount} spans), user corrected: ${view.transcriptConfidence.userCorrected}</div>
  </div>

  <h2>Guardrail triggers</h2>
  ${guardrailSection}

  <h2>Marks (total ${view.total})</h2>
  ${view.criteria.map(renderCriterionCard).join('')}

  ${teacherSection}

  <h2>Transcript</h2>
  ${view.evidenceGroups.map(renderTranscriptGroup).join('')}
</body>
</html>
`;
}
