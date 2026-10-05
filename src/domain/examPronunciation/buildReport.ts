/**
 * Exam-mode pronunciation analysis — builds what the UI shows (plan §2) from
 * stored turn evidence. Part-level output (highlights, patterns, fluency) is
 * computed here, client-side, from the per-turn rows (plan §3b).
 *
 *  - the report section: candidate turns by part with reported words
 *    highlighted, each reported word with a "you" clip when the recording is
 *    still in memory; the top 2–3 sound patterns; one fluency sentence;
 *  - the Coached rail's end-of-part card: up to 2 words and 1 pattern.
 *
 * Pure: it reads the envelope of nothing, changes nothing it is given, and
 * emits no number but a turn key and a clip's playback range. Every display
 * string passes the shared mark/band filter; one that fails is dropped,
 * never rewritten (ADR 0009).
 */

import { claimMentionsMarkOrBand } from '../examFeedback/shared/markClaimFilter';
import { FAIRNESS_CONFIG, judgeTurns, normalizeWord } from './fairness';
import { buildFluencyNote } from './fluencyNote';
import { buildPatterns } from './patterns';
import { PRONUNCIATION_PARTS, type SpeechTurn } from './segment';
import { trimmedToOriginalS, type TrimSegment } from './trim';
import type {
  ExamPronunciationPartCard,
  ExamPronunciationPartReport,
  ExamPronunciationReport,
  ExamPronunciationTurnEvidence,
  FairnessWordVerdict,
  PlaybackClip,
  ReportedWord,
  SoundPattern,
  TranscriptTurn,
} from './types';
import { EXAM_PRONUNCIATION_VERSION } from './version';

/** Context kept either side of a word when playing the candidate's own recording. */
export const CLIP_PADDING_S = 0.12;

export interface BuildReportInput {
  /** Candidate speech turns (segmentSpeechTurns), any order. */
  turns: readonly SpeechTurn[];
  /** Stored evidence rows for this session (GET or POST results). */
  evidence: readonly ExamPronunciationTurnEvidence[];
  /** Each turn's trim map while its recording is still in memory; a missing entry means "recording not kept". */
  trimSegments?: ReadonlyMap<number, readonly TrimSegment[]>;
}

function safeText(text: string | null): string | null {
  return text !== null && !claimMentionsMarkOrBand(text) ? text : null;
}

function safePatterns(patterns: SoundPattern[]): SoundPattern[] {
  return patterns.filter((p) => !claimMentionsMarkOrBand(p.label) && !claimMentionsMarkOrBand(p.explanation));
}

function clipFor(
  evidence: ExamPronunciationTurnEvidence,
  verdict: FairnessWordVerdict,
  segments: readonly TrimSegment[] | undefined,
): PlaybackClip | null {
  const word = evidence.words[verdict.index];
  if (!segments || segments.length === 0 || word.offsetMs === null || word.durationMs === null) return null;
  const start = trimmedToOriginalS(segments, word.offsetMs / 1000);
  const end = trimmedToOriginalS(segments, (word.offsetMs + word.durationMs) / 1000);
  return { startS: Math.max(0, start - CLIP_PADDING_S), endS: end + CLIP_PADDING_S };
}

function transcriptTurn(turn: SpeechTurn, reported: readonly FairnessWordVerdict[]): TranscriptTurn {
  const tokens = turn.transcript.split(/\s+/).filter(Boolean).map((text) => ({ text, reported: false }));
  let cursor = 0;
  for (const v of [...reported].sort((a, b) => a.index - b.index)) {
    const target = normalizeWord(v.word);
    for (let i = cursor; i < tokens.length; i++) {
      if (normalizeWord(tokens[i].text) === target) {
        tokens[i].reported = true;
        cursor = i + 1;
        break;
      }
    }
  }
  return { turnKey: turn.turnKey, part: turn.part, tokens };
}

export function buildExamPronunciationReport({ turns, evidence, trimSegments }: BuildReportInput): ExamPronunciationReport {
  const evidenceByTurn = new Map(evidence.map((e) => [Number(e.turnKey), e]));
  const verdicts = judgeTurns(evidence);
  const reported = verdicts.filter((v) => v.reported);
  const orderedTurns = [...turns].sort((a, b) => a.turnKey - b.turnKey);

  const parts: ExamPronunciationPartReport[] = [];
  for (const part of PRONUNCIATION_PARTS) {
    const partTurns = orderedTurns.filter((t) => t.part === part);
    if (partTurns.length === 0) continue;
    const partEvidence = partTurns.map((t) => evidenceByTurn.get(t.turnKey)).filter((e) => e !== undefined);
    const partReported = reported.filter((v) => v.part === part);
    const reportedWords: ReportedWord[] = partReported.map((v) => ({
      word: v.word,
      turnKey: v.turnKey,
      part,
      category: v.category,
      clip: clipFor(evidenceByTurn.get(v.turnKey)!, v, trimSegments?.get(v.turnKey)),
      lowerConfidence: v.lowerConfidence,
    }));
    parts.push({
      part,
      reportedWords,
      patterns: safePatterns(buildPatterns(partReported)),
      fluencyNote: safeText(
        buildFluencyNote({
          pauseStats: partEvidence.map((e) => e.pauseStats),
          transcripts: partEvidence.map((e) => e.examTranscript),
        }),
      ),
      lowerConfidence: partEvidence.some((e) => e.singleRecognizer),
    });
  }

  const analysed = orderedTurns.map((t) => evidenceByTurn.get(t.turnKey)).filter((e) => e !== undefined);
  return {
    fairnessVersion: EXAM_PRONUNCIATION_VERSION,
    parts,
    transcript: orderedTurns.map((t) => transcriptTurn(t, reported.filter((v) => v.turnKey === t.turnKey))),
    patterns: safePatterns(buildPatterns(reported)),
    fluencyNote: safeText(
      buildFluencyNote({
        pauseStats: analysed.map((e) => e.pauseStats),
        transcripts: analysed.map((e) => e.examTranscript),
      }),
    ),
    lowerConfidence: analysed.some((e) => e.singleRecognizer),
  };
}

/** The Coached rail's end-of-part card: up to 2 distinct words and 1 pattern, never a number. */
export function buildPartCard(partReport: ExamPronunciationPartReport): ExamPronunciationPartCard {
  const words: string[] = [];
  const seen = new Set<string>();
  for (const w of partReport.reportedWords) {
    const key = normalizeWord(w.word);
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(w.word);
    if (words.length >= FAIRNESS_CONFIG.partCardMaxWords) break;
  }
  return {
    part: partReport.part,
    words,
    pattern: partReport.patterns.slice(0, FAIRNESS_CONFIG.partCardMaxPatterns)[0] ?? null,
  };
}
