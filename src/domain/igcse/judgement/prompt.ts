/**
 * S1 Layer-2 judgement prompt — assembles rubric-cited examiner prompt from frozen S0 data.
 */

import { IGCSE_0520_SPEAKING } from '../rubric';
import type { MarkBand } from '../rubric';
import type { EvidenceProfile } from '../evidence/types';
import type { ConversationTurn, ExaminerSupport, SpeakingTranscript } from './types';

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
  }
}`;

/**
 * scoring-prompt-v0.6: the QoL call's contract puts `errors` FIRST, so the
 * model commits to its error list before it picks a band.
 */
const QOL_JSON_OUTPUT_CONTRACT = `{
  "errors": [
    {
      "source": "topic1" | "topic2",
      "turnId": "<turn id as rendered>",
      "quote": "<verbatim substring of THAT turn's candidate response>",
      "kind": "grammar" | "vocabulary",
      "correction": "<correct French>"
    }
  ],
  "errorFrequency": "no errors" | "occasional errors" | "some errors" | "frequent errors" | "rarely accurate" | "almost always inaccurate",
  "mark": <integer 0-15>,
  "band": { "min": <int>, "max": <int>, "label": "<band label or null for 0>" },
  "bestFitPlacement": "convincingly" | "adequately" | "just",
  "descriptorsApplied": ["<verbatim descriptor bullets from chosen band>"],
  "justification": "<brief examiner reasoning>",
  "evidenceSpans": [{ "source": "topic1" | "topic2", "quote": "<substring from candidate response>" }]
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

/** Further-question turns (toSpeakingTranscript) carry turnId 'further1' | 'further2'. */
const FURTHER_TURN_ID = /^further\d+$/;

function formatSupport(support: ExaminerSupport): string {
  const quoted = (text: string | null) => (text === null ? 'none' : `'${text}'`);
  return [
    `Repeated ×${support.repetitions}`,
    `Alternative question used: ${quoted(support.alternativeAsked)}`,
    `Second part asked: ${quoted(support.secondPartAsked)}`,
    `Extension prompts: ${support.extensionPrompts}`,
  ].join(' | ');
}

function formatRolePlayTaskLine(task: SpeakingTranscript['rolePlay'][number]): string {
  const parts = [`Instruction: ${task.taskPrompt}`];
  if (task.secondPartPrompt !== undefined) parts.push(`Second part: '${task.secondPartPrompt}'`);
  if (task.repetitions !== undefined) parts.push(`Repeated ×${task.repetitions}`);
  return parts.join(' | ');
}

function formatTurnLine(turn: ConversationTurn): string {
  const asked = `Asked: ${turn.questionPrompt}`;
  return turn.examinerSupport ? `${asked} | ${formatSupport(turn.examinerSupport)}` : asked;
}

function formatTranscript(transcript: SpeakingTranscript): string {
  const lines: string[] = ['## Candidate transcript (responses only)', ''];

  lines.push('### Role play [evidence source: rolePlay]');
  for (const task of transcript.rolePlay) {
    lines.push(`Task ${task.taskId}`);
    lines.push(formatRolePlayTaskLine(task));
    lines.push(`Candidate response: ${task.candidateResponse}`);
    lines.push('');
  }

  for (const conv of transcript.topicConversations) {
    lines.push(`### Topic conversation ${conv.conversationId} [evidence source: ${conv.conversationId}]`);
    if (conv.topicArea) {
      lines.push(`Topic area: ${conv.topicArea}`);
    }
    for (const turn of conv.turns) {
      lines.push(
        FURTHER_TURN_ID.test(turn.turnId)
          ? `Turn ${turn.turnId} — Further question (examiner's choice)`
          : `Turn ${turn.turnId}`,
      );
      lines.push(formatTurnLine(turn));
      lines.push(`Candidate response: ${turn.candidateResponse}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * scoring-prompt-v0.6: the QoL call's transcript — topic conversations only
 * (p.12: QoL is for "performance in both topic conversations"), each turn's
 * question and candidate answer, with no examiner-support line and no role
 * play. The turn ids rendered here are the ones QoL error quotes cite.
 */
function formatTopicTranscript(transcript: SpeakingTranscript): string {
  const lines: string[] = ['## Candidate transcript — topic conversations only', ''];

  for (const conv of transcript.topicConversations) {
    lines.push(`### Topic conversation ${conv.conversationId} [evidence source: ${conv.conversationId}]`);
    for (const turn of conv.turns) {
      lines.push(
        FURTHER_TURN_ID.test(turn.turnId)
          ? `Turn ${turn.turnId} — Further question (examiner's choice)`
          : `Turn ${turn.turnId}`,
      );
      lines.push(`Asked: ${turn.questionPrompt}`);
      lines.push(`Candidate response: ${turn.candidateResponse}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Phase 1 (§10.3 "Prompt-field allow-list", §9.5 R2 point 4): renders ONLY
 * these EvidenceProfileSubset fields, never the whole EvidenceProfile.
 * New fields (observations, features, detectorRuns, ...) must NOT be
 * added here without bumping SCORING_PROMPT_VERSION — see prompt.test.ts's
 * rendered-field-set snapshot, which fails if this list silently grows.
 *
 * D1: `formatEvidence` below is driven BY this array (iterated in this
 * order), not merely asserted equal to it — an unlisted field is now
 * structurally unrenderable rather than just untested.
 *
 * P0 step 3 (scoring-prompt-v0.5): only the two FACTUAL counts remain.
 * timeFrameAlignmentByQuestion, fillerDensityByQuestion and
 * rolePlayPartsByTask are unvalidated L1 heuristics (verification-log.md:
 * "keep this signal advisory until [real-transcript] check passes"; that check
 * never ran) that mislabel ordinary French, so they no longer reach the judge.
 * They are still computed and snapshotted in the envelope for audit. An L1
 * heuristic re-enters this list only once it has been validated.
 */
const PROMPT_EVIDENCE_ALLOW_LIST = [
  'responseCountsByQuestion',
  'topicConversationDurationByConversation',
] as const;

type AllowedEvidenceField = (typeof PROMPT_EVIDENCE_ALLOW_LIST)[number];

const EVIDENCE_SECTION_RENDERERS: Record<AllowedEvidenceField, (evidence: EvidenceProfile) => string[]> = {
  responseCountsByQuestion: (evidence) => [
    '### Response word/utterance counts (per question or task)',
    ...evidence.responseCountsByQuestion.map(
      (row) => `- ${row.questionId}: wordCount=${row.wordCount}, responseCount=${row.responseCount}`,
    ),
    '',
  ],
  topicConversationDurationByConversation: (evidence) => [
    '### Topic-conversation candidate speaking time and word count (per conversation)',
    ...evidence.topicConversationDurationByConversation.map(
      (row) =>
        `- ${row.conversationId}: candidateSpeakingDurationS=${row.candidateSpeakingDurationS}, candidateWordCount=${row.candidateWordCount}`,
    ),
    '',
  ],
};

function formatEvidence(evidence: EvidenceProfile): string {
  const lines: string[] = [
    '## Layer 1 evidence (deterministic detector output — an input to your judgement, not a mark)',
    '',
    'This evidence is factual counts only (words, responses, speaking time), measured, not judged. It is context for your judgement; do not treat it as a substitute for reading the transcript.',
    '',
  ];

  for (const field of PROMPT_EVIDENCE_ALLOW_LIST) {
    lines.push(...EVIDENCE_SECTION_RENDERERS[field](evidence));
  }

  return lines.join('\n');
}

const EXAMINER_ROLE = 'You are a Cambridge IGCSE French 0520 Paper 3 Speaking examiner.';

/**
 * scoring-prompt-v0.6 main L2 call ('rolePlayCommunication'): role play and
 * Communication, with the full transcript (examiner support included) and the
 * L1 counts allow-list. Quality of Language is NOT marked here — see
 * buildQualityOfLanguagePrompt.
 */
export function buildRolePlayCommunicationPrompt(
  transcript: SpeakingTranscript,
  evidence: EvidenceProfile,
): string {
  const sections = [
    EXAMINER_ROLE,
    '',
    'Mark the candidate using ONLY the descriptors below. Work bottom-up: start at the lowest band/mark and work upwards to find the best fit.',
    '',
    formatRolePlayRubric(),
    formatBandRubric('Table B', IGCSE_0520_SPEAKING.communication),
    formatTranscript(transcript),
    formatEvidence(evidence),
    '## Marking instructions',
    '',
    '1. Role play: award 0, 1, or 2 per task separately. There are NO middle marks for role play — do not apply the convincingly/adequately/just placement principle to role play.',
    '2. Communication: award ONE mark out of 15, combined across BOTH topic conversations.',
    "3. Quality of Language is marked in a separate step. Mark Communication on Table B's descriptors only.",
    '4. For Communication, after selecting the best-fit band, apply:',
    '   - convincingly meets the level → award the HIGHEST mark in the band',
    '   - adequately meets the level → award the MIDDLE mark in the band',
    '   - just meets the level → award the LOWEST mark in the band',
    '5. Cite the VERBATIM descriptor text you are applying (copy exactly from the mark scheme above).',
    '6. For EVERY mark decision, quote specific spans from the candidate transcript as evidence.',
    '7. NEVER invent evidence not present in the transcript. If there is no creditable response, award 0.',
    '8. Mark positively — reward achievement.',
    "9. Judge the first Communication bullet (repetition / use of the alternative question) ONLY from the examiner support recorded on each turn's \"Asked:\" line (Repeated ×n, Alternative question used). Do not infer repetition or alternative-question use from the candidate's words. Where an alternative question was used, the candidate was answering that question, not the main one.",
    '10. The transcript is speech-recognition output. Ignore spelling-only differences that cannot be heard (-é/-er/-ez endings, silent agreement endings) and ignore all punctuation.',
    "11. Role play: quote each task's evidence ONLY from that task's own candidate response, never from another task. If a task has no creditable response, award 0 and give an empty evidenceSpans array for that task.",
    '',
    '## Output format',
    '',
    'Return ONLY a JSON object (no markdown, no prose outside JSON) matching this shape:',
    '',
    JSON_OUTPUT_CONTRACT,
  ];

  return sections.join('\n');
}

/**
 * Table C grades errors only by frequency; the "minor errors are allowed"
 * allowance exists only in the role-play scheme (p.10). Exported so
 * prompt.test.ts can assert it is rendered verbatim.
 */
export const QOL_NO_MINOR_ALLOWANCE_LINE =
  'Table C grades errors only by how often they occur. Unlike the role-play scheme, it has no allowance for minor errors. Do not excuse an error as a slip.';

/** Nothing in Table C refers to amount of speech. Exported for prompt.test.ts. */
export const QOL_NO_QUANTITY_LINE =
  "Do not reward the quantity of speech or the number of ideas. Development and opinions belong to Communication, which is marked separately. 'Range' means variety of structures and vocabulary, not length.";

/** The error list is evidence, not a scoring formula. Exported for prompt.test.ts. */
export const QOL_NOT_A_FORMULA_LINE =
  'The error list and errorFrequency are evidence for interpreting the Table C descriptors, not a scoring formula. Do not convert the number of errors, an error rate, or the length of the error list into a mark. Choose the band as a holistic best fit against the descriptors as written: range of structures and vocabulary, accuracy and completeness, ambiguity, and positive marking together.';

/** Error quotes are grounded per turn, accents and all. Exported for prompt.test.ts. */
export const QOL_QUOTE_RULE_LINE =
  "Each error's turnId is the turn whose Candidate response contains it. Copy the quote exactly as written there, including any missing accents or ASR spellings. Never quote the examiner's question.";

/**
 * scoring-prompt-v0.6 second L2 call ('qualityOfLanguage'): Table C (with its
 * CEFR line, the topic-conversation best-fit principles and the
 * positive-marking principle) and the topic conversations only — no role play,
 * no examiner-support lines, no L1 word counts (they invite rewarding
 * quantity). The judge lists every error before it chooses a band.
 */
export function buildQualityOfLanguagePrompt(transcript: SpeakingTranscript): string {
  const sections = [
    EXAMINER_ROLE,
    '',
    'In this step you mark Quality of Language ONLY, for the two topic conversations. Role play and Communication are marked separately.',
    '',
    formatBandRubric('Table C', IGCSE_0520_SPEAKING.qualityOfLanguage),
    formatTopicTranscript(transcript),
    '## Marking instructions',
    '',
    "1. First list EVERY grammar and vocabulary error in the candidate's topic-conversation answers, one entry per error, with a verbatim quote and the correct form. Only then choose the band.",
    `2. ${QOL_QUOTE_RULE_LINE}`,
    '3. The transcript is speech-recognition output. Ignore spelling-only differences that cannot be heard (-é/-er/-ez endings, silent agreement or plural endings, missing accents) and ignore all punctuation. Such differences are not errors.',
    '4. Pronunciation, intonation and expression cannot be heard from a transcript. Best-fit the Quality of Language band on its other bullets, and state in the justification that delivery (pronunciation, intonation and expression) was not assessed.',
    '5. Then set errorFrequency to the wording from the Table C bullets above that describes those errors: "occasional errors", "some errors", "frequent errors", "rarely accurate" or "almost always inaccurate" ("no errors" if your list is empty). Read \'occasional\', \'some\' and \'frequent\' against what the candidate actually said, not as counts.',
    '6. 13–15 allows only occasional errors in more complex language.',
    `7. ${QOL_NO_MINOR_ALLOWANCE_LINE}`,
    `8. ${QOL_NO_QUANTITY_LINE}`,
    '9. Mark positively — credit the accurate structures and vocabulary the candidate actually used.',
    `10. ${QOL_NOT_A_FORMULA_LINE}`,
    '11. Work bottom-up: start at the lowest band and work upwards to find the best fit. After selecting the best-fit band, apply:',
    '   - convincingly meets the level → award the HIGHEST mark in the band',
    '   - adequately meets the level → award the MIDDLE mark in the band',
    '   - just meets the level → award the LOWEST mark in the band',
    '12. Cite the VERBATIM descriptor text you are applying (copy exactly from the mark scheme above).',
    '13. Quote specific spans from the candidate\'s topic-conversation answers as evidence (source "topic1" or "topic2" only). NEVER invent evidence not present in the transcript. If there is no creditable response, award 0.',
    '',
    '## Output format',
    '',
    'Return ONLY a JSON object (no markdown, no prose outside JSON) matching this shape, with "errors" first:',
    '',
    QOL_JSON_OUTPUT_CONTRACT,
  ];

  return sections.join('\n');
}

/** @internal Exported for tests — JSON contract snippets. */
export const _JSON_OUTPUT_CONTRACT = JSON_OUTPUT_CONTRACT;
export const _QOL_JSON_OUTPUT_CONTRACT = QOL_JSON_OUTPUT_CONTRACT;

/** @internal Exported for tests — the allow-list, so prompt.test.ts can snapshot it. */
export const _PROMPT_EVIDENCE_ALLOW_LIST = PROMPT_EVIDENCE_ALLOW_LIST;
