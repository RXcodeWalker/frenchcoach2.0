/**
 * S10 ConductLog -> SessionTranscript builder. Produces output shape/semantics-
 * identical to ASR-produced transcripts (S6-S9 calibration is provenance-
 * agnostic): passes the existing parseSessionTranscript validator, and
 * examinerEvents carry the same ExaminerEventKind semantics annotateExaminer
 * would assign. Deliberately ignores ConductLog's `trigger` field and the
 * candidate turn's `requestedRepeat`/`relevant` signals — those are app-side
 * debug/replay data only; the scored SessionTranscript schema is untouched.
 *
 * `intent` (C4) is the one deliberate exception: a candidate entry classified
 * as `repeat_request` or `non_french` has its scored text/words blanked below
 * (kept verbatim in the ConductLog for replay) so a spoken "peux-tu répéter"
 * or an English aside never gets joined into the scored response. `dont_know`
 * keeps its real text — it's a substantive (if unhelpful) answer. `intent`
 * itself is still never serialized onto the output Utterance, same as the
 * other app-side fields above.
 */

import { STT_SCHEMA_VERSION } from '../stt/version';
import { SESSION_ENGINE_VERSION } from './version';
import { parseSessionTranscript } from '../stt/schema';
import type {
  AudioProvenance,
  ContentProvenance,
  ExaminerEvent,
  ExaminerEventKind,
  SessionTranscript,
  Utterance,
  Word,
} from '../stt/types';
import type { ConductLog, ConductLogCandidateEntry, ConductLogExaminerEntry, SessionQuestionSet } from './types';

const ACTION_TO_EVENT_KIND: Record<string, ExaminerEventKind | null> = {
  READ_MAIN: 'main_question',
  REPEAT: 'repetition',
  READ_ALTERNATIVE: 'alternative_question',
  EXTENSION_PROMPT: 'extension_prompt',
  FURTHER_QUESTION: 'extension_prompt',
  // C6: a transition becomes examiner *speech* (an Utterance) but never an
  // ExaminerEvent — the toSpeakingTranscript projection drops examiner speech
  // entirely, so this has zero scoring impact.
  TRANSITION: null,
  ADVANCE: null,
  END: null,
};

/** Synthesizes evenly-spaced Word entries spanning [startS, endS] from whitespace-tokenized text, at confidence 1 (source is authoritative). */
function synthesizeWords(text: string, startS: number, endS: number): Word[] {
  const tokens = text.trim().length > 0 ? text.trim().split(/\s+/) : [];
  if (tokens.length === 0) return [];

  const span = Math.max(endS - startS, 0);
  const step = span / tokens.length;

  return tokens.map((token, i) => ({
    text: token,
    startS: startS + i * step,
    endS: startS + (i + 1) * step,
    confidence: 1,
  }));
}

function examinerEntryToUtterance(entry: ConductLogExaminerEntry, index: number): Utterance {
  const durationS = Math.max(entry.text.length > 0 ? entry.text.split(/\s+/).length * 0.3 : 0.5, 0.5);
  const startS = entry.atS;
  const endS = startS + durationS;
  return {
    utteranceId: `engine-examiner-${index}`,
    role: 'examiner',
    speakerCluster: 'engine',
    part: entry.part,
    questionId: entry.questionId,
    startS,
    endS,
    text: entry.text,
    words: synthesizeWords(entry.text, startS, endS),
  };
}

/** Candidate intents whose scored text/words are blanked — see module header. */
const BLANKED_INTENTS = new Set(['repeat_request', 'non_french']);

function candidateEntryToUtterance(entry: ConductLogCandidateEntry, index: number): Utterance {
  const blank = entry.intent !== undefined && BLANKED_INTENTS.has(entry.intent);
  const text = blank ? '' : entry.transcript;
  return {
    utteranceId: `engine-candidate-${index}`,
    role: 'candidate',
    speakerCluster: 'user',
    part: entry.part,
    questionId: entry.questionId,
    startS: entry.startS,
    endS: entry.endS,
    text,
    words: blank ? [] : synthesizeWords(entry.transcript, entry.startS, entry.endS),
  };
}

function examinerEntryToEvent(entry: ConductLogExaminerEntry, index: number, utteranceId: string): ExaminerEvent | null {
  const kind = ACTION_TO_EVENT_KIND[entry.action];
  if (kind === undefined) throw new Error(`buildSessionTranscript: unknown examiner action "${entry.action}"`);
  if (kind === null) return null;

  return {
    eventId: `engine-event-${index}`,
    utteranceId,
    atS: entry.atS,
    part: entry.part,
    kind,
    questionId: entry.questionId,
    matchScore: 1,
  };
}

export interface BuildSessionTranscriptMeta {
  sessionId: string;
  recordedAt: string;
  contentProvenance: ContentProvenance;
  audio: AudioProvenance;
  questionSetHash: string;
}

/**
 * Converts a completed ConductLog + SessionQuestionSet into a SessionTranscript.
 * Output validates via parseSessionTranscript and matches the app-conducted.json
 * fixture shape: annotationSource 'session-engine-log', roleLabelConfidence 1,
 * stt.provider/model 'session-engine', diarizationModel/alignmentModel null.
 */
export function buildSessionTranscript(
  log: ConductLog,
  questionSet: SessionQuestionSet,
  meta: BuildSessionTranscriptMeta,
): SessionTranscript {
  const utterances: Utterance[] = [];
  const examinerEvents: ExaminerEvent[] = [];

  let examinerIndex = 0;
  let candidateIndex = 0;

  for (const entry of log.entries) {
    if (entry.kind === 'examiner') {
      const utterance = examinerEntryToUtterance(entry, examinerIndex);
      utterances.push(utterance);
      const event = examinerEntryToEvent(entry, examinerIndex, utterance.utteranceId);
      if (event) examinerEvents.push(event);
      examinerIndex += 1;
    } else {
      utterances.push(candidateEntryToUtterance(entry, candidateIndex));
      candidateIndex += 1;
    }
  }

  const transcript: SessionTranscript = {
    schemaVersion: STT_SCHEMA_VERSION,
    assemblerVersion: SESSION_ENGINE_VERSION,
    sessionId: meta.sessionId,
    recordedAt: meta.recordedAt,
    contentProvenance: meta.contentProvenance,
    userCorrected: false,
    audio: meta.audio,
    stt: {
      model: 'session-engine',
      modelVersion: SESSION_ENGINE_VERSION,
      provider: 'session-engine',
      languageCode: 'fr',
      alignmentModel: null,
      diarizationModel: null,
      decodeParamsHash: '0'.repeat(64),
      confidenceSource: 'faster-whisper-probability',
      promptBiasedRetries: 0,
      transcribedAt: meta.recordedAt,
    },
    annotationSource: 'session-engine-log',
    questionSetId: questionSet.questionSetId,
    questionSetHash: meta.questionSetHash,
    matchThreshold: 1,
    roleLabelConfidence: 1,
    utterances,
    examinerEvents,
  };

  return parseSessionTranscript(transcript);
}
