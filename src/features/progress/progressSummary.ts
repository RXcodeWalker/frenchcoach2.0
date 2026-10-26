/**
 * Pure read-models for the Progress screen. Every exam aggregate here counts
 * only attempts that count toward progress (`!practiceOnly`, ADR-0007), and a
 * Learn topic average stays `null` until a real score exists — never 0.
 * Nothing here computes a mark, XP or mastery; it only reads what was stored.
 */
import type { StoredSession } from '../../services/analytics/analyticsService';
import type { ExamAreaMarks, SkillProfile, Topic, TopicMasteryEntry } from '../../types';

const DAY_MS = 86_400_000;
export const EXAM_TOTAL_MAX = 40;
export const EXAM_WINDOW_DAYS = 7;
export const CONSISTENCY_WINDOW_DAYS = 14;
export const WEAK_SKILL_LIMIT = 3;

// ── Exam ─────────────────────────────────────────────────────────────────────

export type ExamAreaKey = 'rolePlay' | 'communication' | 'qualityOfLanguage';

export interface ExamArea {
  key: ExamAreaKey;
  label: string;
  mark: number;
  max: number;
}

export interface CountedExamAttempt {
  id: string;
  date: string;
  /** Out of 40. Read from `examMarks` when saved, else recovered from the /10 rescale. */
  total: number;
  marks: ExamAreaMarks | null;
}

export interface ExamSummary {
  /** Counted (Exam Sim) attempts with a real mark, newest first. */
  counted: CountedExamAttempt[];
  /** The newest counted attempt that has area marks saved, if any. */
  latestWithAreas: CountedExamAttempt | null;
  areas: ExamArea[];
  weakestArea: ExamArea | null;
  /** Exam attempts left out of the figures above because they don't count (Coached, typed, resumed, early start). */
  practiceExcludedCount: number;
}

/** /10 rescale back to /40: ExamMode stores round(total / 4, 1 dp), which `round(score * 4)` inverts exactly. */
export function examTotalOutOf40(session: Pick<StoredSession, 'score' | 'examMarks'>): number | null {
  if (session.examMarks) return session.examMarks.total;
  if (typeof session.score !== 'number' || !Number.isFinite(session.score)) return null;
  return Math.round(session.score * 4);
}

export function examAreas(marks: ExamAreaMarks): ExamArea[] {
  const areas: ExamArea[] = [
    { key: 'rolePlay', label: 'Role play', mark: marks.rolePlay, max: marks.rolePlayMax },
    { key: 'communication', label: 'Communication', mark: marks.communication, max: 15 },
    { key: 'qualityOfLanguage', label: 'Quality of language', mark: marks.qualityOfLanguage, max: 15 },
  ];
  return areas.filter(a => a.max > 0);
}

export function weakestExamArea(areas: ExamArea[]): ExamArea | null {
  let weakest: ExamArea | null = null;
  for (const area of areas) {
    if (!weakest || area.mark / area.max < weakest.mark / weakest.max) weakest = area;
  }
  return weakest;
}

/** `sessions` newest first, as getSessionHistory returns them. */
export function examSummary(sessions: StoredSession[]): ExamSummary {
  const exams = sessions.filter(s => s.mode === 'exam');
  const counted: CountedExamAttempt[] = [];
  for (const s of exams) {
    if (s.practiceOnly) continue;
    const total = examTotalOutOf40(s);
    if (total === null) continue;
    counted.push({ id: s.id, date: s.date, total, marks: s.examMarks ?? null });
  }
  const latestWithAreas = counted.find(a => a.marks) ?? null;
  const areas = latestWithAreas?.marks ? examAreas(latestWithAreas.marks) : [];
  return {
    counted,
    latestWithAreas,
    areas,
    weakestArea: weakestExamArea(areas),
    practiceExcludedCount: exams.filter(s => s.practiceOnly).length,
  };
}

// ── Learn ────────────────────────────────────────────────────────────────────

export interface LearnTopicRow {
  key: string;
  label: string;
  sessionsCompleted: number;
  questionsAnswered: number;
  questionsTotal: number;
  /** /10, Exam standard. null until a scored session exists. */
  averageScore: number | null;
  mastered: boolean;
  dueForReview: number;
}

export interface WeakSkill {
  id: string;
  name: string;
  /** 0–100. */
  mastery: number;
}

export interface LearnSummary {
  visibleTopicCount: number;
  /** Practised visible topics, most recently practised first. */
  topics: LearnTopicRow[];
  masteredCount: number;
  dueForReview: number;
  streakDays: number;
  daysPractisedRecently: number;
  weakSkills: WeakSkill[];
}

export interface LearnSummaryInput {
  topics: Topic[];
  isTopicVisible: (topic: Topic) => boolean;
  topicMastery: Record<string, TopicMasteryEntry>;
  dueCounts: Record<string, number>;
  sessions: StoredSession[];
  streakDays: number;
  skillProfile: SkillProfile;
  now?: number;
}

export function daysPractisedWithin(sessions: StoredSession[], days: number, now: number = Date.now()): number {
  const cutoff = now - days * DAY_MS;
  const keys = new Set<string>();
  for (const s of sessions) {
    if (!isLearnOrExam(s)) continue;
    const t = new Date(s.date).getTime();
    if (t >= cutoff && t <= now) keys.add(s.date.slice(0, 10));
  }
  return keys.size;
}

/** Skills the evidence projection has seen at least twice and still rates below 75% — the same rule the old Insights tab used. */
export function weakSkills(skillProfile: SkillProfile, limit = WEAK_SKILL_LIMIT): WeakSkill[] {
  return Object.entries(skillProfile)
    .filter(([, s]) => s.feedbackCount >= 2 && s.score < 0.75)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, limit)
    .map(([id, s]) => ({ id, name: s.name, mastery: Math.round(s.score * 100) }));
}

export function learnSummary(input: LearnSummaryInput): LearnSummary {
  const visible = input.topics.filter(input.isTopicVisible);
  const rows: LearnTopicRow[] = [];
  for (const topic of visible) {
    const entry = input.topicMastery[topic.key];
    if (!entry || entry.sessionsCompleted <= 0) continue;
    rows.push({
      key: topic.key,
      label: topic.labelEn,
      sessionsCompleted: entry.sessionsCompleted,
      questionsAnswered: entry.uniqueQuestionsAnswered.length,
      questionsTotal: topic.questionsCount,
      averageScore: typeof entry.averageScore === 'number' && Number.isFinite(entry.averageScore) ? entry.averageScore : null,
      mastered: entry.mastered === true,
      dueForReview: input.dueCounts[topic.key] ?? 0,
    });
  }
  rows.sort((a, b) => lastPractised(input.topicMastery, b.key) - lastPractised(input.topicMastery, a.key));
  const visibleKeys = new Set(visible.map(t => t.key));
  return {
    visibleTopicCount: visible.length,
    topics: rows,
    masteredCount: rows.filter(r => r.mastered).length,
    dueForReview: Object.entries(input.dueCounts)
      .filter(([key]) => visibleKeys.has(key))
      .reduce((sum, [, n]) => sum + n, 0),
    streakDays: input.streakDays,
    daysPractisedRecently: daysPractisedWithin(input.sessions, CONSISTENCY_WINDOW_DAYS, input.now),
    weakSkills: weakSkills(input.skillProfile),
  };
}

function lastPractised(topicMastery: Record<string, TopicMasteryEntry>, key: string): number {
  const t = new Date(topicMastery[key]?.lastSessionAt ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

// ── Next step ────────────────────────────────────────────────────────────────

export type NextStepKind = 'first-session' | 'review-due' | 'exam-sim' | 'weakest-topic' | 'new-topic';

export interface NextStep {
  kind: NextStepKind;
  title: string;
  detail: string;
  cta: string;
  to: string;
}

export interface NextStepInput {
  sessions: StoredSession[];
  exam: ExamSummary;
  learn: LearnSummary;
  now?: number;
}

export function learnTopicPath(topicKey: string): string {
  return `/learn?topic=${encodeURIComponent(topicKey)}`;
}

/**
 * One recommendation, first match wins: nothing yet → Learn; answers due for
 * spaced review → that topic; no exam sat in the weekly window → Exam Sim;
 * otherwise the weakest-scoring practised topic. The weekly-window check uses
 * any exam attempt, Coached included, because the sample-exam allowance does.
 */
export function nextStep({ sessions, exam, learn, now = Date.now() }: NextStepInput): NextStep {
  if (!sessions.some(isLearnOrExam)) {
    return {
      kind: 'first-session',
      title: 'Answer your first Learn question',
      detail: 'Pick a topic, speak your answer in French and get feedback on it. Your progress starts here.',
      cta: 'Go to Learn',
      to: '/learn',
    };
  }

  const mostDue = [...learn.topics].filter(t => t.dueForReview > 0).sort((a, b) => b.dueForReview - a.dueForReview)[0];
  if (mostDue) {
    return {
      kind: 'review-due',
      title: `Review ${mostDue.label}`,
      detail: `${plural(mostDue.dueForReview, 'answer')} from this topic ${mostDue.dueForReview === 1 ? 'is' : 'are'} due for spaced review.`,
      cta: 'Start review',
      to: learnTopicPath(mostDue.key),
    };
  }

  const windowStart = now - EXAM_WINDOW_DAYS * DAY_MS;
  const examThisWindow = sessions.some(s => s.mode === 'exam' && new Date(s.date).getTime() >= windowStart);
  if (!examThisWindow) {
    return {
      kind: 'exam-sim',
      title: exam.counted.length === 0 ? 'Sit your first Exam Sim' : 'Sit this week’s Exam Sim',
      detail: 'A full 0520 speaking exam marked out of 40. You get one sample exam every 7 days.',
      cta: 'Start Exam Sim',
      to: '/exam',
    };
  }

  const areaNote = exam.weakestArea ? ` ${exam.weakestArea.label} was your weakest exam area last time.` : '';
  const weakest = learn.topics
    .filter(t => t.averageScore !== null && !t.mastered)
    .sort((a, b) => (a.averageScore as number) - (b.averageScore as number))[0];
  if (weakest) {
    return {
      kind: 'weakest-topic',
      title: `Practise ${weakest.label}`,
      detail: `Your lowest-scoring Learn topic (${(weakest.averageScore as number).toFixed(1)}/10).${areaNote}`,
      cta: 'Practise this topic',
      to: learnTopicPath(weakest.key),
    };
  }

  return {
    kind: 'new-topic',
    title: 'Try a new Learn topic',
    detail: `Broaden what you can talk about in the exam.${areaNote}`,
    cta: 'Go to Learn',
    to: '/learn',
  };
}

// ── Past attempts ────────────────────────────────────────────────────────────

export type PastAttempt =
  | {
      kind: 'exam';
      id: string;
      date: string;
      counted: boolean;
      total: number | null;
      areas: ExamArea[];
    }
  | {
      kind: 'learn';
      id: string;
      date: string;
      topicLabel: string;
      /** /10, Exam standard. */
      score: number | null;
      questionText: string;
      transcript: string;
      feedbackSummary: string | null;
    };

export function pastAttempts(sessions: StoredSession[], topics: Topic[]): PastAttempt[] {
  const labelOf = (key: string | null) => (key && topics.find(t => t.key === key)?.labelEn) || 'Learn';
  const rows: PastAttempt[] = [];
  for (const s of sessions) {
    if (s.mode === 'exam') {
      rows.push({
        kind: 'exam',
        id: s.id,
        date: s.date,
        counted: !s.practiceOnly,
        total: examTotalOutOf40(s),
        areas: s.examMarks ? examAreas(s.examMarks) : [],
      });
    } else if (s.mode === 'practice') {
      rows.push({
        kind: 'learn',
        id: s.id,
        date: s.date,
        topicLabel: labelOf(s.topicKey),
        score: typeof s.score === 'number' && Number.isFinite(s.score) ? s.score : null,
        questionText: s.questionText,
        transcript: s.transcript,
        feedbackSummary: s.feedbackSummary ?? null,
      });
    }
  }
  return rows;
}

function isLearnOrExam(s: Pick<StoredSession, 'mode'>): boolean {
  return s.mode === 'practice' || s.mode === 'exam';
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
