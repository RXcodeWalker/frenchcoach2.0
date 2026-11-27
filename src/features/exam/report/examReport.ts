/**
 * Pure view helpers for the exam results screen (redesign 2026-11-27). They
 * only arrange what the envelope view and the post-marking report already
 * hold: every mark is copied from the envelope, never recomputed or
 * estimated, and nothing here predicts a grade. The practice plan ranks the
 * three areas by the marks the envelope did not award, so it can never be
 * a second opinion on a mark.
 */
import type { EnvelopeView, EvidenceGroupView, QolErrorView } from '../../../domain/igcse/envelope/envelopeView';
import type { SessionTranscript } from '../../../domain/igcse/stt/types';
import type { ExamFeedbackNextStep, ExamFeedbackReport } from '../../../domain/examFeedback/types';
import { ERROR_CATEGORY_LABELS, type ErrorCategory } from '../../../domain/examFeedback/shared/errorCategories';
import type { StoredSession } from '../../../services/analytics/analyticsService';
import type { ExamAreaMarks } from '../../../types';

export type ExamArea = 'rolePlay' | 'communication' | 'qualityOfLanguage';

export const AREA_LABEL: Record<ExamArea, string> = {
  rolePlay: 'Role play',
  communication: 'Communication',
  qualityOfLanguage: 'Quality of Language',
};

/** TN p.6, p.10–12: role-play tasks are /2 each, Communication and Quality of Language /15. */
const ROLE_PLAY_TASK_MAX = 2;
const TOPIC_AREA_MAX = 15;

export interface AreaMark {
  area: ExamArea;
  mark: number;
  max: number;
}

/** The three scored areas, copied from the envelope (role play summed over its tasks). */
export function areaMarks(view: EnvelopeView): AreaMark[] {
  const tasks = view.criteria.filter((c) => c.criterion === 'rolePlayTask');
  const mark = (criterion: 'communication' | 'qualityOfLanguage') =>
    view.criteria.find((c) => c.criterion === criterion)?.mark ?? 0;
  const areas: AreaMark[] = [];
  if (tasks.length > 0) {
    areas.push({
      area: 'rolePlay',
      mark: tasks.reduce((sum, t) => sum + t.mark, 0),
      max: tasks.length * ROLE_PLAY_TASK_MAX,
    });
  }
  areas.push({ area: 'communication', mark: mark('communication'), max: TOPIC_AREA_MAX });
  areas.push({ area: 'qualityOfLanguage', mark: mark('qualityOfLanguage'), max: TOPIC_AREA_MAX });
  return areas;
}

/** A display tone from the share of an area's marks awarded (the same 80 % / 60 % cut-offs as `scoreFill`'s 8 and 6 of 10). */
export function areaTone(mark: number, max: number): 'progress' | 'reward' | 'correction' {
  const share = max > 0 ? mark / max : 0;
  return share >= 0.8 ? 'progress' : share >= 0.6 ? 'reward' : 'correction';
}

/** Where a practice item takes the learner. Routes that already exist; nothing new is opened. */
export type PracticeRoute = '/exam/role-play' | '/learn' | '/exam?mode=coached';

export interface PracticeItem {
  area: ExamArea;
  /** Marks the envelope did not award in this area. */
  lost: number;
  /** The report's next step for this area, when the report has one. */
  nextStep: ExamFeedbackNextStep | null;
  /** Role play only: the task ids credited below the top mark, in order. */
  tasksBelowFull: string[];
  /** Quality of Language only: how many mistakes the marker listed. */
  mistakeCount: number;
  /** Quality of Language only: the category with the most mistakes, when the report categorised them. */
  topCategory: { label: string; count: number } | null;
  action: { label: string; to: PracticeRoute };
}

function topCategory(report: ExamFeedbackReport | null): PracticeItem['topCategory'] {
  const errors = report?.qualityOfLanguage.errors ?? [];
  if (errors.length === 0) return null;
  const counts = new Map<ErrorCategory, number>();
  for (const e of errors) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  // Ties keep first-seen order (Map insertion order + a stable sort).
  const [category, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (category === 'other') return null;
  return { label: ERROR_CATEGORY_LABELS[category], count };
}

const ACTION: Record<ExamArea, PracticeItem['action']> = {
  rolePlay: { label: 'Drill a role play', to: '/exam/role-play' },
  communication: { label: 'Practise longer answers in Learn', to: '/learn' },
  qualityOfLanguage: { label: 'Practise in Learn', to: '/learn' },
};

/**
 * The areas to work on, most marks left first. An area with every mark
 * awarded is not in the plan. Ties keep the paper's order (role play first).
 */
export function practicePlan(view: EnvelopeView, report: ExamFeedbackReport | null): PracticeItem[] {
  const qolErrors = view.criteria.find((c) => c.criterion === 'qualityOfLanguage')?.errors ?? [];
  const items: PracticeItem[] = areaMarks(view)
    .filter((a) => a.mark < a.max)
    .map((a) => ({
      area: a.area,
      lost: a.max - a.mark,
      nextStep:
        a.area === 'rolePlay'
          ? report?.rolePlay.nextStep ?? null
          : a.area === 'communication'
            ? report?.communication.nextStep ?? null
            : report?.qualityOfLanguage.nextStep ?? null,
      tasksBelowFull:
        a.area === 'rolePlay'
          ? view.criteria.filter((c) => c.criterion === 'rolePlayTask' && c.mark < ROLE_PLAY_TASK_MAX).map((c) => c.taskId ?? '')
          : [],
      mistakeCount: a.area === 'qualityOfLanguage' ? qolErrors.length : 0,
      topCategory: a.area === 'qualityOfLanguage' ? topCategory(report) : null,
      action: ACTION[a.area],
    }));
  return items.sort((a, b) => b.lost - a.lost);
}

/** "rp3" → "Task 3". Anything else is shown as it is. */
export function taskLabel(taskId: string): string {
  const m = /^rp(\d+)$/.exec(taskId);
  return m ? `Task ${m[1]}` : taskId;
}

// ── Last counted attempt ─────────────────────────────────────────────────────

export interface PreviousExam {
  date: string;
  marks: ExamAreaMarks;
}

/**
 * The newest counted Exam Sim before this one, with its area marks — read
 * from the stored history, never this attempt (matched on its scoring
 * session id, so it works before and after ADD_SESSION lands). Coached and
 * other practice-only attempts never count (ADR 0007).
 */
export function previousCountedExam(sessions: StoredSession[], currentScoringSessionId: string): PreviousExam | null {
  const found = sessions
    .filter(
      (s) =>
        s.mode === 'exam' &&
        !s.practiceOnly &&
        s.examMarks &&
        s.scoringSessionId !== currentScoringSessionId,
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
  return found?.examMarks ? { date: found.date, marks: found.examMarks } : null;
}

/** Marks now minus marks last time, per area and in total. Two numbers read, never a trend. */
export function changeSince(view: EnvelopeView, previous: PreviousExam): { total: number; byArea: Record<ExamArea, number> } {
  const now = Object.fromEntries(areaMarks(view).map((a) => [a.area, a.mark])) as Partial<Record<ExamArea, number>>;
  return {
    total: view.total - previous.marks.total,
    byArea: {
      rolePlay: (now.rolePlay ?? 0) - previous.marks.rolePlay,
      communication: (now.communication ?? 0) - previous.marks.communication,
      qualityOfLanguage: (now.qualityOfLanguage ?? 0) - previous.marks.qualityOfLanguage,
    },
  };
}

// ── The exam in numbers ──────────────────────────────────────────────────────

export interface ExamFacts {
  answers: number;
  speakingS: number;
  words: number;
  /** The most words in one answer. */
  longestAnswerWords: number;
}

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Facts about what the candidate said, read off the transcript (no marks). */
export function examFacts(transcript: SessionTranscript): ExamFacts {
  const answers = transcript.utterances.filter((u) => u.role === 'candidate');
  const counts = answers.map((u) => wordsIn(u.text));
  return {
    answers: answers.length,
    speakingS: answers.reduce((sum, u) => sum + Math.max(0, u.endS - u.startS), 0),
    words: counts.reduce((a, b) => a + b, 0),
    longestAnswerWords: counts.length ? Math.max(...counts) : 0,
  };
}

// ── Your answers ─────────────────────────────────────────────────────────────

export interface AnswerMistake {
  quote: string;
  correction: string;
  category?: ErrorCategory;
}

export interface AnswerRow {
  group: EvidenceGroupView;
  /** "Question 3", "Further question 1", "Task 2". */
  label: string;
  /** The marker's mistakes in this answer (topic answers only), categorised when the report is in. */
  mistakes: AnswerMistake[];
  /** Role-play tasks: the task's mark, copied from the envelope. */
  taskMark?: number;
}

export interface AnswerPart {
  part: EvidenceGroupView['part'];
  title: string;
  rows: AnswerRow[];
}

const PART_TITLE: Record<EvidenceGroupView['part'], string> = {
  rolePlay: 'Role play',
  topic1: 'Topic conversation 1',
  topic2: 'Topic conversation 2',
};

/** "topic1:q3" → "Question 3", "topic2:further1" → "Further question 1". */
export function turnLabel(questionOrTaskId: string): string {
  const id = questionOrTaskId.includes(':') ? questionOrTaskId.split(':')[1] : questionOrTaskId;
  const q = /^q(\d+)$/.exec(id);
  if (q) return `Question ${q[1]}`;
  const f = /^further(\d+)$/.exec(id);
  if (f) return `Further question ${f[1]}`;
  return taskLabel(id);
}

/**
 * Every answer the scorer read, grouped by part in exam order, each with the
 * mistakes the marker found in it. A mistake is matched to its answer by the
 * envelope's own `source` + `turnId`, never by searching for its quote.
 */
export function answersByPart(view: EnvelopeView, report: ExamFeedbackReport | null): AnswerPart[] {
  const qolErrors: QolErrorView[] = view.criteria.find((c) => c.criterion === 'qualityOfLanguage')?.errors ?? [];
  const categoryAt = (i: number) => report?.qualityOfLanguage.errors.find((e) => e.errorIndex === i)?.category;
  const parts: AnswerPart[] = [];
  for (const group of view.evidenceGroups) {
    let part = parts.find((p) => p.part === group.part);
    if (!part) {
      part = { part: group.part, title: PART_TITLE[group.part], rows: [] };
      parts.push(part);
    }
    const turnId = group.questionOrTaskId.includes(':') ? group.questionOrTaskId.split(':')[1] : group.questionOrTaskId;
    const mistakes: AnswerMistake[] =
      group.part === 'rolePlay'
        ? []
        : qolErrors.flatMap((e, i) =>
            e.source === group.part && e.turnId === turnId
              ? [{ quote: e.quote, correction: e.correction, category: categoryAt(i) }]
              : [],
          );
    const taskMark =
      group.part === 'rolePlay'
        ? view.criteria.find((c) => c.criterion === 'rolePlayTask' && c.taskId === group.questionOrTaskId)?.mark
        : undefined;
    part.rows.push({ group, label: turnLabel(group.questionOrTaskId), mistakes, ...(taskMark !== undefined ? { taskMark } : {}) });
  }
  return parts;
}

export interface AnswerSegment {
  text: string;
  mistake?: AnswerMistake;
}

/**
 * An answer cut into plain text and mistakes, in reading order, for the
 * marked-up view. A quote that cannot be found (case-insensitive) or that
 * overlaps one already placed is left out of the markup, never moved; the
 * caller still lists it.
 */
export function segmentAnswer(answer: string, mistakes: readonly AnswerMistake[]): AnswerSegment[] {
  const lower = answer.toLowerCase();
  const placed: { start: number; end: number; mistake: AnswerMistake }[] = [];
  for (const mistake of mistakes) {
    const quote = mistake.quote.trim().toLowerCase();
    if (!quote) continue;
    let from = 0;
    while (from <= lower.length) {
      const i = lower.indexOf(quote, from);
      if (i < 0) break;
      const end = i + quote.length;
      if (!placed.some((p) => i < p.end && end > p.start)) {
        placed.push({ start: i, end, mistake });
        break;
      }
      from = i + 1;
    }
  }
  placed.sort((a, b) => a.start - b.start);
  const out: AnswerSegment[] = [];
  let cursor = 0;
  for (const p of placed) {
    if (p.start > cursor) out.push({ text: answer.slice(cursor, p.start) });
    out.push({ text: answer.slice(p.start, p.end), mistake: p.mistake });
    cursor = p.end;
  }
  if (cursor < answer.length) out.push({ text: answer.slice(cursor) });
  return out;
}
