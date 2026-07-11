/**
 * S1 Layer-2 judgement prompt — assembles rubric-cited examiner prompt from frozen S0 data.
 */

import { IGCSE_0520_SPEAKING } from '../rubric';
import type { MarkBand } from '../rubric';
import type { EvidenceProfileSubset } from '../evidence/types';
import type { SpeakingTranscript } from './types';

interface BandCriterion {
  table: string;
  name: string;
  combinedAcross: string;
  cefrReference: string;
  awardInstruction: string;
  bands: readonly MarkBand[];
}

const JSON_OUTPUT_CONTRACT = `{
  "rolePlay": {
    "tasks": [
      {
        "taskId": "<taskId>",
        "mark": 0 | 1 | 2,
        "descriptorApplied": "<verbatim descriptor bullet from the mark scheme>",
        "evidenceSpans": [{ "source": "rolePlay", "quote": "<substring from candidate response>" }]
      }
    ]
  },
  "communication": {
    "mark": <integer 0-15>,
    "band": { "min": <int>, "max": <int>, "label": "<band label or null for 0>" },
    "bestFitPlacement": "convincingly" | "adequately" | "just",
    "descriptorsApplied": ["<verbatim descriptor bullets from chosen band>"],
    "justification": "<brief examiner reasoning>",
    "evidenceSpans": [{ "source": "topic1" | "topic2", "quote": "<substring from candidate response>" }]
  },
  "qualityOfLanguage": {
    "mark": <integer 0-15>,
    "band": { "min": <int>, "max": <int>, "label": "<band label or null for 0>" },
    "bestFitPlacement": "convincingly" | "adequately" | "just",
    "descriptorsApplied": ["<verbatim descriptor bullets from chosen band>"],
    "justification": "<brief examiner reasoning>",
    "evidenceSpans": [{ "source": "topic1" | "topic2", "quote": "<substring from candidate response>" }]
  }
}`;

function formatRolePlayRubric(): string {
  const { rolePlay, principles } = IGCSE_0520_SPEAKING;
  const rpPrinciples = principles.filter((p) => p.scope === 'rolePlay' || p.scope === 'global');
  const lines: string[] = ['## Table A — Role play (5 tasks × 0/1/2 marks)', ''];

  for (const principle of rpPrinciples) {
    lines.push(`- ${principle.text}`);
  }
  lines.push('');

  for (const markEntry of [...rolePlay.marks].sort((a, b) => b.mark - a.mark)) {
    lines.push(`### Mark ${markEntry.mark}`);
    for (const bullet of markEntry.descriptor) {
      lines.push(`- ${bullet}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatBandRubric(tableName: string, criterion: BandCriterion): string {
  const lines: string[] = [
    `## ${tableName} — ${criterion.name} (combined across ${criterion.combinedAcross}, 0–15 marks)`,
    '',
    criterion.cefrReference,
    '',
    criterion.awardInstruction,
    '',
  ];

  const tcPrinciples = IGCSE_0520_SPEAKING.principles.filter(
    (p) => p.scope === 'topicConversation' || p.scope === 'global',
  );
  for (const principle of tcPrinciples) {
    lines.push(`- ${principle.text}`);
  }
  lines.push('');

  for (const band of criterion.bands) {
    const label = band.label ?? '0 (no creditable response)';
    lines.push(`### ${band.min}–${band.max}: ${label}`);
    for (const bullet of band.descriptor) {
      lines.push(`- ${bullet}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatTranscript(transcript: SpeakingTranscript): string {
  const lines: string[] = ['## Candidate transcript (responses only)', ''];

  lines.push('### Role play [evidence source: rolePlay]');
  for (const task of transcript.rolePlay) {
    lines.push(`Task ${task.taskId}`);
    lines.push(`Instruction: ${task.taskPrompt}`);
    lines.push(`Candidate response: ${task.candidateResponse}`);
    lines.push('');
  }

  for (const conv of transcript.topicConversations) {
    lines.push(`### Topic conversation ${conv.conversationId} [evidence source: ${conv.conversationId}]`);
    if (conv.topicArea) {
      lines.push(`Topic area: ${conv.topicArea}`);
    }
    for (const turn of conv.turns) {
      lines.push(`Turn ${turn.turnId}`);
      lines.push(`Question: ${turn.questionPrompt}`);
      lines.push(`Candidate response: ${turn.candidateResponse}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function formatEvidence(evidence: EvidenceProfileSubset): string {
  const lines: string[] = [
    '## Layer 1 evidence (deterministic detector output — an input to your judgement, not a mark)',
    '',
    'This evidence is measured, not judged. Use it as instructed under "Marking instructions" below; do not treat it as a substitute for reading the transcript.',
    '',
  ];

  lines.push('### Time-frame alignment (per question)');
  for (const row of evidence.timeFrameAlignmentByQuestion) {
    lines.push(
      `- ${row.questionId}: expected=${row.expectedTimeFrame ?? 'n/a'}, detected=${row.detectedTimeFrame ?? 'n/a'}, alignment=${row.alignment}`,
    );
  }
  lines.push('');

  lines.push('### Response word/utterance counts (per question or task)');
  for (const row of evidence.responseCountsByQuestion) {
    lines.push(`- ${row.questionId}: wordCount=${row.wordCount}, responseCount=${row.responseCount}`);
  }
  lines.push('');

  lines.push('### Filler density (per question or task)');
  for (const row of evidence.fillerDensityByQuestion) {
    lines.push(
      `- ${row.questionId}: fillerCount=${row.fillerCount}, wordCount=${row.wordCount}, density=${row.density.toFixed(3)}`,
    );
  }
  lines.push('');

  lines.push('### Role-play parts addressed (per task)');
  for (const row of evidence.rolePlayPartsByTask) {
    lines.push(
      `- ${row.taskId}: partsExpected=${row.partsExpected}, partsAddressed=${row.partsAddressed}`,
    );
  }
  lines.push('');

  lines.push('### Topic-conversation candidate speaking time and word count (per conversation)');
  for (const row of evidence.topicConversationDurationByConversation) {
    lines.push(
      `- ${row.conversationId}: candidateSpeakingDurationS=${row.candidateSpeakingDurationS}, candidateWordCount=${row.candidateWordCount}`,
    );
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Build the full examiner prompt with frozen rubric descriptors, transcript context,
 * and Layer 1 evidence.
 */
export function buildJudgementPrompt(
  transcript: SpeakingTranscript,
  evidence: EvidenceProfileSubset,
  rubric = IGCSE_0520_SPEAKING,
): string {
  void rubric; // rubric param reserved for future versioning; content pulled from frozen export

  const sections = [
    'You are a Cambridge IGCSE French 0520 Paper 3 Speaking examiner.',
    '',
    'Mark the candidate using ONLY the descriptors below. Work bottom-up: start at the lowest band/mark and work upwards to find the best fit.',
    '',
    formatRolePlayRubric(),
    formatBandRubric('Table B', IGCSE_0520_SPEAKING.communication),
    formatBandRubric('Table C', IGCSE_0520_SPEAKING.qualityOfLanguage),
    formatTranscript(transcript),
    formatEvidence(evidence),
    '## Marking instructions',
    '',
    '1. Role play: award 0, 1, or 2 per task separately. There are NO middle marks for role play — do not apply the convincingly/adequately/just placement principle to role play.',
    '2. Communication and Quality of Language: award ONE mark out of 15 each, combined across BOTH topic conversations.',
    '3. For Communication and Quality of Language, after selecting the best-fit band, apply:',
    '   - convincingly meets the level → award the HIGHEST mark in the band',
    '   - adequately meets the level → award the MIDDLE mark in the band',
    '   - just meets the level → award the LOWEST mark in the band',
    '4. Cite the VERBATIM descriptor text you are applying (copy exactly from the mark scheme above).',
    '5. For EVERY mark decision, quote specific spans from the candidate transcript as evidence.',
    '6. NEVER invent evidence not present in the transcript. If there is no creditable response, award 0.',
    '7. Mark positively — reward achievement.',
    '',
    '## Output format',
    '',
    'Return ONLY a JSON object (no markdown, no prose outside JSON) matching this shape:',
    '',
    JSON_OUTPUT_CONTRACT,
  ];

  return sections.join('\n');
}

/** @internal Exported for tests — JSON contract snippet. */
export const _JSON_OUTPUT_CONTRACT = JSON_OUTPUT_CONTRACT;
