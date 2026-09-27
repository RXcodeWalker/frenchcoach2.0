/**
 * S1 Layer-2 scoring orchestration — provenance guard → prompt → judge → parse → validate.
 *
 * scoring-prompt-v0.6: L2 is two judge calls — role play + Communication
 * (scoreRolePlayAndCommunication) and Quality of Language
 * (scoreQualityOfLanguage) — combined by the pure combineAssessment. Retry
 * policy is the caller's (scoreAttempt retries each call independently).
 */

import type { EvidenceProfile } from '../evidence/types';
import { IGCSE_0520_SPEAKING } from '../rubric';
import {
  JudgementValidationError,
  parseQualityOfLanguageOutput,
  parseRolePlayCommunicationOutput,
} from './schema';
import { buildQualityOfLanguagePrompt, buildRolePlayCommunicationPrompt } from './prompt';
import type {
  Judge,
  JudgeKind,
  QualityOfLanguageAssessment,
  RolePlayCommunicationAssessment,
  SpeakingAssessment,
  SpeakingTranscript,
} from './types';

export class ProvenanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvenanceError';
  }
}

const KNOWN_PROVENANCES = new Set(['original-practice', 'confidential-internal']);

/** Must be a known provenance before any judge call. Does not gate redistribution. */
function assertProvenance(transcript: SpeakingTranscript): void {
  if (!KNOWN_PROVENANCES.has(transcript.contentProvenance)) {
    throw new ProvenanceError(
      `contentProvenance must be a known provenance, got "${transcript.contentProvenance as string}"`,
    );
  }
}

/**
 * Blocks confidential-internal transcripts (teacher recordings against TN booklets)
 * from export/sync paths. Called by the Supabase sync adapter and any corpus/anchor
 * export path — never by scoreSpeaking itself, which only needs assertProvenance.
 */
export function assertRedistributable(transcript: SpeakingTranscript): void {
  if (transcript.contentProvenance === 'confidential-internal') {
    throw new ProvenanceError(
      'Transcript is confidential-internal and must not be redistributed or exported',
    );
  }
}

/**
 * Strips one wrapping markdown code fence (```json … ``` or ``` … ```) from a
 * judge reply. Some providers fence their JSON even when asked for bare JSON;
 * before this, that fence alone made JSON.parse throw a terminal
 * JudgementValidationError. Only a fence enclosing the whole reply is removed —
 * the content itself is never rewritten, and schema validation still runs on it.
 */
export function stripJsonFence(raw: string): string {
  const match = /^```(?:json)?[ \t]*\r?\n?([\s\S]*?)\r?\n?[ \t]*```$/i.exec(raw.trim());
  return match ? match[1] : raw;
}

async function callJudge(judge: Judge, kind: JudgeKind, prompt: string): Promise<unknown> {
  const { raw } = await judge({ kind, prompt });
  const stripped = stripJsonFence(raw);
  try {
    return JSON.parse(stripped);
  } catch {
    // Diagnostics only — never the reply text itself (it can carry the
    // candidate's own words). looksTruncated is a cheap truncation signal,
    // not a claim about why parsing failed.
    throw new JudgementValidationError(
      kind === 'qualityOfLanguage'
        ? 'Quality of Language judge response is not valid JSON'
        : 'Judge response is not valid JSON',
      { replyLength: raw.length, looksTruncated: !stripped.trim().endsWith('}') },
    );
  }
}

/**
 * The 'rolePlayCommunication' L2 call.
 *
 * Phase 1 (§9.4 R1): evidence is a parameter, not built internally — the
 * caller (scoreAttempt) builds the EvidenceProfile once and injects the same
 * object into both this prompt path and the envelope snapshot, so "the
 * profile the LLM saw === the audited snapshot" is a structural guarantee.
 */
export async function scoreRolePlayAndCommunication(
  transcript: SpeakingTranscript,
  evidence: EvidenceProfile,
  judge: Judge,
): Promise<RolePlayCommunicationAssessment> {
  assertProvenance(transcript);
  const parsed = await callJudge(judge, 'rolePlayCommunication', buildRolePlayCommunicationPrompt(transcript, evidence));
  return parseRolePlayCommunicationOutput(parsed, transcript);
}

/** The 'qualityOfLanguage' L2 call — topic conversations only, no L1 counts. */
export async function scoreQualityOfLanguage(
  transcript: SpeakingTranscript,
  judge: Judge,
): Promise<QualityOfLanguageAssessment> {
  assertProvenance(transcript);
  const parsed = await callJudge(judge, 'qualityOfLanguage', buildQualityOfLanguagePrompt(transcript));
  return parseQualityOfLanguageOutput(parsed, transcript);
}

/** Pure: joins the two L2 results and derives the total (never trusted from the judge). */
export function combineAssessment(
  main: RolePlayCommunicationAssessment,
  qualityOfLanguage: QualityOfLanguageAssessment,
): SpeakingAssessment {
  const total = main.rolePlay.total + main.communication.mark + qualityOfLanguage.mark;
  if (total < 0 || total > IGCSE_0520_SPEAKING.totalMarks) {
    throw new JudgementValidationError(`total ${total} out of range`);
  }
  return { rolePlay: main.rolePlay, communication: main.communication, qualityOfLanguage, total };
}

/**
 * Convenience: both L2 calls concurrently against one judge, no retry. The
 * production path (scoreAttempt) calls the two functions above directly so it
 * can give each call its own fresh judge instance and its own retry.
 */
export async function scoreSpeaking(
  transcript: SpeakingTranscript,
  evidence: EvidenceProfile,
  judge: Judge,
): Promise<SpeakingAssessment> {
  assertProvenance(transcript);
  const [main, qualityOfLanguage] = await Promise.all([
    scoreRolePlayAndCommunication(transcript, evidence, judge),
    scoreQualityOfLanguage(transcript, judge),
  ]);
  return combineAssessment(main, qualityOfLanguage);
}

export { JudgementValidationError };
