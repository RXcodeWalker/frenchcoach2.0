/**
 * Pure view-model builder: ScoringEnvelope (+ optional TeacherMarkSet) ->
 * a shape purpose-built for rendering (HTML/terminal) and for the batch
 * report's evidence.json artifact. No I/O, no scoring logic — reads already-
 * computed envelope/evidence fields only.
 *
 * `topicArea` and `responseLength` are included per criterion because
 * 02-scoring-pipeline-architecture.md §3.6 confirms S8's calibration anchor
 * selection will key on exactly these two dimensions — reusing
 * EvidenceProfileSubset's existing word counts, not a new detector.
 */

import type { EvidenceProfileSubset } from '../evidence/types';
import type { ScoringEnvelope } from './types';
import type { EvidenceSpan, SpeakingTranscript, TopicConversation } from '../judgement/types';
import type { TeacherMark, TeacherMarkSet } from '../comparison/teacherMark';

export type ResponseLengthBracket = 'short' | 'medium' | 'long';

/** UNVALIDATED — toolkit-only display bucketing, not a scoring threshold. */
export function bracketResponseLength(wordCount: number): ResponseLengthBracket {
  if (wordCount < 40) return 'short';
  if (wordCount < 90) return 'medium';
  return 'long';
}

export interface EvidenceQuoteView {
  source: EvidenceSpan['source'];
  quote: string;
}

export interface CriterionView {
  criterion: 'rolePlayTask' | 'communication' | 'qualityOfLanguage';
  taskId?: string;
  mark: number;
  band?: { min: number; max: number; label: string | null };
  confidence: string;
  justification: string;
  evidenceSpans: EvidenceQuoteView[];
  teacherMark?: TeacherMark;
  /** S8 anchor-selection key — see file header. Undefined when not derivable (role-play tasks). */
  topicArea?: 'A' | 'B' | 'C' | 'D' | 'E';
  responseLength?: ResponseLengthBracket;
}

export interface GuardrailTriggerView {
  id: string;
}

export interface EvidenceGroupView {
  part: 'rolePlay' | 'topic1' | 'topic2';
  questionOrTaskId: string;
  prompt: string;
  candidateResponse: string;
  wordCount?: number;
  fillerDensity?: number;
  timeFrameAlignment?: string;
}

export interface EnvelopeView {
  attemptId: string;
  sessionId: string;
  scoredAt: string;
  contentProvenance: string;
  versions: ScoringEnvelope['versions'];
  llm: ScoringEnvelope['llm'];
  transcriptConfidence: ScoringEnvelope['transcriptConfidence'];
  total: number;
  criteria: CriterionView[];
  guardrailTriggers: GuardrailTriggerView[];
  evidenceGroups: EvidenceGroupView[];
  teacherMarkSet?: TeacherMarkSet;
}

function topicAreaForConversation(
  transcript: SpeakingTranscript,
  conversationId: 'topic1' | 'topic2',
): 'A' | 'B' | 'C' | 'D' | 'E' | undefined {
  const conversation = transcript.topicConversations.find(
    (c: TopicConversation) => c.conversationId === conversationId,
  );
  return conversation?.topicArea;
}

function wordCountForQuestion(evidence: EvidenceProfileSubset, questionId: string): number | undefined {
  return evidence.responseCountsByQuestion.find((r) => r.questionId === questionId)?.wordCount;
}

function findTeacherMark(
  marks: TeacherMark[],
  criterion: CriterionView['criterion'],
  taskId?: string,
): TeacherMark | undefined {
  if (criterion === 'rolePlayTask') {
    return marks.find((m) => m.criterion === criterion && m.taskId === taskId);
  }
  return marks.find((m) => m.criterion === criterion);
}

function toEvidenceQuoteView(spans: EvidenceSpan[]): EvidenceQuoteView[] {
  return spans.map((s) => ({ source: s.source, quote: s.quote }));
}

export function buildEnvelopeView(envelope: ScoringEnvelope, teacherMarkSet?: TeacherMarkSet): EnvelopeView {
  const marks = teacherMarkSet?.marks ?? [];
  const transcript = envelope.transcriptSnapshot;
  const evidence = envelope.evidenceProfileSnapshot;

  const criteria: CriterionView[] = [];

  for (const task of envelope.rolePlayTasks) {
    criteria.push({
      criterion: 'rolePlayTask',
      taskId: task.taskId,
      mark: task.mark,
      confidence: task.confidence,
      justification: task.justification,
      evidenceSpans: toEvidenceQuoteView(task.evidenceSpans),
      teacherMark: findTeacherMark(marks, 'rolePlayTask', task.taskId),
    });
  }

  const topic1WordCount = evidence.responseCountsByQuestion
    .filter((r) => r.questionId.startsWith('topic1:'))
    .reduce((sum, r) => sum + r.wordCount, 0);
  const topic2WordCount = evidence.responseCountsByQuestion
    .filter((r) => r.questionId.startsWith('topic2:'))
    .reduce((sum, r) => sum + r.wordCount, 0);
  const combinedTopicWordCount = topic1WordCount + topic2WordCount;

  // Communication/QoL evidence can be drawn from either topic conversation; topicArea is
  // attached only when both conversations agree (their spans are unattributed to one topic).
  const topic1Area = topicAreaForConversation(transcript, 'topic1');
  const topic2Area = topicAreaForConversation(transcript, 'topic2');
  const sharedTopicArea = topic1Area !== undefined && topic1Area === topic2Area ? topic1Area : undefined;

  criteria.push({
    criterion: 'communication',
    mark: envelope.communication.mark,
    band: envelope.communication.band,
    confidence: envelope.communication.confidence,
    justification: envelope.communication.justification,
    evidenceSpans: toEvidenceQuoteView(envelope.communication.evidenceSpans),
    teacherMark: findTeacherMark(marks, 'communication'),
    topicArea: sharedTopicArea,
    responseLength: bracketResponseLength(combinedTopicWordCount),
  });

  criteria.push({
    criterion: 'qualityOfLanguage',
    mark: envelope.qualityOfLanguage.mark,
    band: envelope.qualityOfLanguage.band,
    confidence: envelope.qualityOfLanguage.confidence,
    justification: envelope.qualityOfLanguage.justification,
    evidenceSpans: toEvidenceQuoteView(envelope.qualityOfLanguage.evidenceSpans),
    teacherMark: findTeacherMark(marks, 'qualityOfLanguage'),
    topicArea: sharedTopicArea,
    responseLength: bracketResponseLength(combinedTopicWordCount),
  });

  const evidenceGroups: EvidenceGroupView[] = [];

  for (const task of transcript.rolePlay) {
    evidenceGroups.push({
      part: 'rolePlay',
      questionOrTaskId: task.taskId,
      prompt: task.taskPrompt,
      candidateResponse: task.candidateResponse,
    });
  }

  for (const conversation of transcript.topicConversations) {
    for (const turn of conversation.turns) {
      const questionId = `${conversation.conversationId}:${turn.turnId}`;
      const timeFrame = evidence.timeFrameAlignmentByQuestion.find((t) => t.questionId === questionId);
      const filler = evidence.fillerDensityByQuestion.find((f) => f.questionId === questionId);
      evidenceGroups.push({
        part: conversation.conversationId,
        questionOrTaskId: questionId,
        prompt: turn.questionPrompt,
        candidateResponse: turn.candidateResponse,
        wordCount: wordCountForQuestion(evidence, questionId),
        fillerDensity: filler?.density,
        timeFrameAlignment: timeFrame?.alignment,
      });
    }
  }

  const view: EnvelopeView = {
    attemptId: envelope.attemptId,
    sessionId: envelope.sessionId,
    scoredAt: envelope.scoredAt,
    contentProvenance: envelope.contentProvenance,
    versions: envelope.versions,
    llm: envelope.llm,
    transcriptConfidence: envelope.transcriptConfidence,
    total: envelope.total,
    criteria,
    guardrailTriggers: envelope.guardrailTriggers.map((id) => ({ id })),
    evidenceGroups,
  };

  if (teacherMarkSet !== undefined) {
    view.teacherMarkSet = teacherMarkSet;
  }

  return view;
}
