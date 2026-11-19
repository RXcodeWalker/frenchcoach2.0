// ── The coach's 7-day plan, built backwards from the exam ─────────────────────
//
// coachBrain.ts decides what to do *today*. This lays out the week around that
// decision so the learner can see where the effort goes: which day carries the
// Exam Sim, which days target which weakness, which days are review, and what
// the last day before the exam is for.
//
// It is built backwards from the two hard limits, never past them:
//   • one Exam Sim per rolling EXAM_WINDOW_DAYS (7) — at most one in the strip,
//     never before the window reopens (CoachBrief.nextExamAt), and never when the
//     coach wouldn't offer one (no exam goal, Junior lock, exam passed);
//   • LEARN_ANSWERS_PER_DAY (3) AI-marked Learn answers a day — today's budget is
//     what is actually left; role-play cards and the Exam Sim don't spend any.
// and from the exam date: Exam Sims are anchored three days before the exam and
// every seven days before that (so the learner has two days to act on its
// marks), the day after a sim fixes what it showed, and the day before the exam
// is light — no new grammar (coachBrain's final-week rule).
//
// Today always agrees with the mission card: it IS `brief.move`. Everything else
// is drawn from the same ranked candidates (move + alternatives) and the weakest
// skills the evidence model holds, so this adds no second opinion.
//
// Pure: no storage, network or React. It writes nothing and emits no mark.

import { localDay, localDayOf } from '../../lib/localDay';
import { learnTopicPath, EXAM_WINDOW_DAYS } from '../../features/progress/progressSummary';
import { LEARN_ANSWERS_PER_DAY } from '../../features/learn/dailyAllowance';
import {
  bestTopicForSkill,
  WEAK_SKILL_MASTERY,
  WEAK_SKILL_MIN_EVIDENCE,
  FIRST_EXAM_AFTER_ANSWERS,
  type CoachBrief,
  type CoachInput,
  type CoachMove,
  type CoachMoveKind,
} from './coachBrain';

const DAY_MS = 86_400_000;
export const PLAN_DAYS = 7;
/** The sim is anchored this many days before the exam: two days left to act on its marks. */
export const SIM_DAYS_BEFORE_EXAM = 3;
/** At most this many different weaknesses share the week's learn days. */
const MAX_TARGETS = 4;

export type PlanDayKind = 'exam_day' | 'exam_sim' | 'coached_exam' | 'follow_up' | 'learn' | 'review' | 'role_play' | 'light';

export interface PlanDay {
  /** 0 = today. */
  index: number;
  /** Local YYYY-MM-DD. */
  date: string;
  /** "Mon". */
  weekday: string;
  isToday: boolean;
  kind: PlanDayKind;
  /** The strip's one-or-two-word label: "Exam Sim", "Past tense", "Review". */
  label: string;
  /** One sentence for the day's full description. */
  detail: string;
  /** Where the day's activity starts; null for the exam itself. */
  to: string | null;
  topicKey: string | null;
  /** The most AI-marked Learn answers this day can spend (never above the daily limit). */
  learnAnswers: number;
}

export interface WeekPlan {
  /** Today first. Ends at the exam when it falls inside the week. */
  days: PlanDay[];
  /** Index of the real exam inside `days`, or null. */
  examDayIndex: number | null;
  /** Index of the plan's Exam Sim, or null when none fits this week. */
  examSimIndex: number | null;
}

export interface WeekPlanOptions {
  /** AI-marked Learn answers per day; 3 unless a Premium allowance says otherwise. */
  dailyLearnLimit?: number;
}

interface Target {
  label: string;
  title: string;
  to: string;
  topicKey: string | null;
  /** True when the coach tied this to the weak exam area the last Exam Sim exposed. */
  fromExam: boolean;
}

/** Moves that are a Learn session on a weakness (the rest have their own day type). */
const LEARN_KINDS: ReadonlySet<CoachMoveKind> = new Set<CoachMoveKind>([
  'first_steps', 'fix_mistake', 'weak_skill', 'develop_answers', 'two_part_answers', 'new_topic', 'keep_going',
]);

/** Whole days between two local YYYY-MM-DD strings (calendar arithmetic, safe across DST). */
function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** An exam date as a local calendar day: a bare YYYY-MM-DD is already one. */
function examLocalDay(examDate: string | null): string | null {
  if (!examDate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return examDate;
  return localDayOf(examDate) || null;
}

function addDays(from: Date, n: number): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + n, 12);
}

function labelFor(m: CoachMove, input: CoachInput): string {
  if (m.skillIds[0]) return input.skillLabel(m.skillIds[0]);
  const topic = m.topicKey ? input.topics.find(t => t.key === m.topicKey) : undefined;
  return topic ? topic.labelEn : m.title;
}

function targetFromMove(m: CoachMove, input: CoachInput): Target {
  return { label: labelFor(m, input), title: m.title, to: m.to, topicKey: m.topicKey, fromExam: m.evidence.examArea !== undefined };
}

/** The week's weaknesses, best first: the coach's own ranked moves, then the weakest skills it holds. */
function collectTargets(input: CoachInput, brief: CoachBrief): Target[] {
  const out: Target[] = [];
  const seen = new Set<string>();
  const push = (key: string, t: Target) => {
    if (seen.has(key) || out.length >= MAX_TARGETS) return;
    seen.add(key);
    out.push(t);
  };
  for (const m of [brief.move, ...brief.alternatives]) {
    if (!LEARN_KINDS.has(m.kind) || m.kind === 'first_steps') continue; // first steps is not a weakness
    push(`${m.kind}|${m.skillIds[0] ?? ''}|${m.topicKey ?? ''}`, targetFromMove(m, input));
  }
  for (const id of input.weakestSkillIds) {
    const belief = input.skills[id];
    if (!belief || belief.mastery >= WEAK_SKILL_MASTERY || belief.evidenceCount < WEAK_SKILL_MIN_EVIDENCE) continue;
    const topic = bestTopicForSkill(id, input.topics, input.topicStats);
    const label = input.skillLabel(id);
    push(`skill|${id}|`, {
      label,
      title: `Practise ${label}`,
      to: topic ? learnTopicPath(topic.key) : '/learn',
      topicKey: topic?.key ?? null,
      fromExam: false,
    });
  }
  // Too little evidence to name weaknesses: spread the week over the topics practised least.
  if (out.length < 2) {
    const fresh = input.topics
      .filter(t => !t.isAdvanced)
      .sort((a, b) => (input.topicStats[a.key]?.sessionsCompleted ?? 0) - (input.topicStats[b.key]?.sessionsCompleted ?? 0));
    for (const t of fresh.slice(0, 3)) {
      push(`topic|${t.key}`, { label: t.labelEn, title: `Practise ${t.labelEn}`, to: learnTopicPath(t.key), topicKey: t.key, fromExam: false });
    }
  }
  if (out.length === 0) out.push({ label: 'Keep practising', title: 'Speak a little French', to: '/learn', topicKey: null, fromExam: false });
  return out;
}

/**
 * Where the Exam Sim goes, or null when none can this week. The coach's mission
 * wins for today; otherwise it sits on the exam-anchored cadence, no earlier
 * than the window reopens and with at least a day left to act on it.
 */
function placeExamSim(a: {
  input: CoachInput;
  brief: CoachBrief;
  length: number;
  examIdx: number | null;
  todayNum: number;
  examGoal: boolean;
  allowed: boolean;
}): number | null {
  const { input, brief, length, examIdx } = a;
  if (!a.examGoal || !a.allowed) return null;

  if (brief.move.kind === 'exam_sim') return examIdx === 0 ? null : 0;

  let earliest = 1; // today's mission is something else, so the sim is never today
  if (!brief.examAvailable && brief.nextExamAt) {
    const open = localDayOf(brief.nextExamAt);
    if (open) earliest = Math.max(earliest, dayNumber(open) - a.todayNum);
  }
  const sat = input.sessions.some(s => s.mode === 'exam');
  const warmedUp = input.sessions.filter(s => s.mode === 'practice').length >= FIRST_EXAM_AFTER_ANSWERS;
  if (!sat && !warmedUp) earliest = Math.max(earliest, 2); // a baseline needs some warm-up first

  const last = length - 1;
  if (examIdx !== null) {
    // Prefer a follow-up day and a light eve (exam − 3); settle for exam − 2.
    const best = examIdx - SIM_DAYS_BEFORE_EXAM;
    if (best >= earliest && best <= last) return best;
    const fallback = examIdx - 2;
    return fallback >= earliest && fallback <= last ? fallback : null;
  }

  // No exam date: a mid-week slot, a day or two in.
  if (!input.examDate) {
    const slot = Math.max(earliest, 2);
    return slot <= last ? slot : earliest <= last ? earliest : null;
  }

  // An exam date beyond this week: continue the weekly cadence anchored on it.
  const target = examLocalDay(input.examDate);
  if (!target) return null;
  let slot = dayNumber(target) - a.todayNum - SIM_DAYS_BEFORE_EXAM;
  while (slot > last) slot -= EXAM_WINDOW_DAYS;
  if (slot >= earliest) return slot;
  return earliest <= last ? earliest : null;
}

export function buildWeekPlan(input: CoachInput, brief: CoachBrief, options: WeekPlanOptions = {}): WeekPlan {
  const limit = options.dailyLearnLimit ?? LEARN_ANSWERS_PER_DAY;
  const start = new Date(input.now);
  const today = localDay(start);
  const todayNum = dayNumber(today);
  const phase = brief.phase;
  const examGoal = phase !== 'no_exam';

  // The real exam, if it is inside the week; the strip ends there.
  const examDay = examGoal && phase !== 'after_exam' ? examLocalDay(input.examDate) : null;
  const examOffset = examDay ? dayNumber(examDay) - todayNum : null;
  const examIdx = examOffset !== null && examOffset >= 0 && examOffset < PLAN_DAYS ? examOffset : null;
  const length = examIdx !== null ? examIdx + 1 : PLAN_DAYS;

  const simIdx = placeExamSim({
    input, brief, length, examIdx, todayNum, examGoal,
    allowed: phase !== 'after_exam' && input.examUnlocked !== false && (examIdx === null || examIdx > 1 || brief.move.kind === 'exam_sim'),
  });

  const targets = collectTargets(input, brief);
  const dueTotal = Object.values(input.dueCounts).reduce((a, b) => a + b, 0);
  const todayBudget = input.learnAnswersLeft === null ? limit : Math.min(limit, Math.max(0, input.learnAnswersLeft));
  const reviewTopic = Object.entries(input.dueCounts)
    .filter(([k, v]) => v > 0 && input.topics.some(t => t.key === k))
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const reviewTopicLabel = reviewTopic ? input.topics.find(t => t.key === reviewTopic)?.labelEn ?? null : null;

  const kindAt = (i: number): PlanDayKind | null => {
    if (i === examIdx) return 'exam_day';
    if (i === simIdx) return 'exam_sim';
    return null;
  };

  const days: PlanDay[] = [];
  let cursor = 0;
  let freeOrdinal = 0;

  for (let i = 0; i < length; i++) {
    const date = addDays(start, i);
    const base = {
      index: i,
      date: localDay(date),
      weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      isToday: i === 0,
    };
    const budget = i === 0 ? todayBudget : limit;
    const fixed = kindAt(i);

    if (fixed === 'exam_day') {
      days.push({ ...base, kind: 'exam_day', label: 'Exam day', detail: 'Your exam. Warm up gently, speak slowly and develop every answer.', to: null, topicKey: null, learnAnswers: 0 });
      continue;
    }
    if (fixed === 'exam_sim') {
      days.push({
        ...base, kind: 'exam_sim', label: 'Exam Sim',
        detail: i === 0
          ? 'This week’s sample exam, marked out of 40. You get one every 7 days.'
          : 'This week’s sample exam, marked out of 40 — placed so you have time to work on its marks before the real one.',
        to: '/exam', topicKey: null, learnAnswers: 0,
      });
      continue;
    }

    // Today is whatever the mission card says.
    if (i === 0) {
      days.push(todayDay(base, brief.move, input, budget));
      if (LEARN_KINDS.has(brief.move.kind) && brief.move.kind !== 'first_steps') cursor = 1; // today took the first target
      continue;
    }

    // The day before the real exam is light: nothing new.
    if (examIdx !== null && i === examIdx - 1) {
      days.push(
        dueTotal > 0 && reviewTopic
          ? { ...base, kind: 'light', label: 'Light review', detail: `The day before your exam: go over ${reviewTopicLabel ?? 'what’s due'}, nothing new.`, to: learnTopicPath(reviewTopic), topicKey: reviewTopic, learnAnswers: Math.min(1, budget) }
          : { ...base, kind: 'light', label: 'Light warm-up', detail: 'The day before your exam: one easy answer, nothing new. Rest well.', to: '/learn', topicKey: null, learnAnswers: Math.min(1, budget) },
      );
      continue;
    }

    // The day after the sim works on what it showed.
    if (simIdx !== null && i === simIdx + 1) {
      const t = targets.find(x => x.fromExam) ?? targets[cursor % targets.length];
      days.push({ ...base, kind: 'follow_up', label: t.label, detail: `After your Exam Sim: ${t.title.toLowerCase()} while its marks are fresh.`, to: t.to, topicKey: t.topicKey, learnAnswers: budget });
      continue;
    }

    // Free days: learn, with one review day and one role-play day on a steady rhythm.
    const ord = freeOrdinal++;
    const reviewDay = dueTotal > 0 && reviewTopic && (ord === 1 || (dueTotal >= 6 && ord === 4));
    if (reviewDay && reviewTopic) {
      days.push({ ...base, kind: 'review', label: 'Review', detail: `${reviewTopicLabel ?? 'Your due answers'}: coming back just before you’d forget is what makes it stick.`, to: learnTopicPath(reviewTopic), topicKey: reviewTopic, learnAnswers: budget });
      continue;
    }
    if (examGoal && phase !== 'after_exam' && ord === 3) {
      days.push({ ...base, kind: 'role_play', label: 'Role plays', detail: 'Exam-style situations. Role-play cards don’t use your marked Learn answers.', to: '/exam/role-play', topicKey: null, learnAnswers: 0 });
      continue;
    }
    const t = targets[cursor % targets.length];
    cursor++;
    days.push({ ...base, kind: 'learn', label: t.label, detail: `${t.title}.`, to: t.to, topicKey: t.topicKey, learnAnswers: budget });
  }

  return { days, examDayIndex: examIdx, examSimIndex: simIdx };
}

/** Today's day from the mission card's move, so Home never contradicts itself. */
function todayDay(base: Pick<PlanDay, 'index' | 'date' | 'weekday' | 'isToday'>, m: CoachMove, input: CoachInput, budget: number): PlanDay {
  if (m.kind === 'coached_exam') {
    return { ...base, kind: 'coached_exam', label: 'Coached exam', detail: m.title, to: m.to, topicKey: null, learnAnswers: 0 };
  }
  if (m.kind === 'role_play') {
    return { ...base, kind: 'role_play', label: 'Role plays', detail: m.title, to: m.to, topicKey: null, learnAnswers: 0 };
  }
  if (m.usesLearnAnswer && budget === 0) {
    return {
      ...base, kind: 'role_play', label: 'Role plays',
      detail: 'Today’s marked answers are used. Role-play cards don’t count against them, so keep speaking here.',
      to: '/exam/role-play', topicKey: null, learnAnswers: 0,
    };
  }
  if (m.kind === 'review') {
    return { ...base, kind: 'review', label: 'Review', detail: m.title, to: m.to, topicKey: m.topicKey, learnAnswers: budget };
  }
  return { ...base, kind: 'learn', label: m.kind === 'first_steps' ? 'First answers' : labelFor(m, input), detail: m.title, to: m.to, topicKey: m.topicKey, learnAnswers: budget };
}
