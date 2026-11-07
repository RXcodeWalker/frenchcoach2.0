// ── Coach brain: the one "what should I do next, and why" ──────────────────────
//
// Home used to stitch its advice together from three places that did not talk
// to each other (the recommendation engine's skill, the daily plan's rationale
// and "your lowest-average topic"), so the card could name a skill, a different
// reason and a topic with no questions on that skill. This module decides once.
//
// It weighs, in one ranked list:
//   • the exam date — a phase (build → sharpen → exam month → final week)
//     changes what matters;
//   • real Exam Sim results (counted attempts only, ADR-0007) — the weakest of
//     the three 0520 areas points at the drill that lifts it;
//   • the weekly sample-exam window and today's Learn answers — it never sends
//     you to something you can't start;
//   • the evidence model — a tracked recurring mistake, the weakest skill (and
//     whether it is slipping), and the topic whose questions actually practise
//     that skill;
//   • spaced review due, and syllabus breadth (topics never spoken about).
//
// Pure: every input is passed in (coachBriefInput.ts gathers them), no storage,
// no network, no React. It writes nothing and emits no mark — it only reads
// marks that were already shown to the learner on their results screen.

import type { CoachGoalType } from '../../types/coach';
import type { EvidenceDerivedSkillBelief } from '../../types/beliefs';
import type { StoredSession } from '../analytics/analyticsService';
import { examSummary, learnTopicPath, EXAM_WINDOW_DAYS, type ExamArea, type ExamAreaKey } from '../../features/progress/progressSummary';

const DAY_MS = 86_400_000;

/** A weakest skill must be below this mastery, with at least this much evidence, before the coach targets it. */
export const WEAK_SKILL_MASTERY = 0.6;
export const WEAK_SKILL_MIN_EVIDENCE = 2;
/** An exam area scoring under this share of its marks is worth a dedicated move. */
export const WEAK_AREA_RATIO = 0.7;
/** Exam results older than this no longer steer the plan (the learner has moved on). */
export const EXAM_RESULT_FRESH_DAYS = 35;
/** Learn answers on record before the coach suggests a first Exam Sim (a baseline needs some warm-up). */
export const FIRST_EXAM_AFTER_ANSWERS = 3;

export type ExamPhase = 'no_exam' | 'no_date' | 'build' | 'sharpen' | 'exam_month' | 'final_week' | 'after_exam';

export type CoachMoveKind =
  | 'first_steps'
  | 'fix_mistake'
  | 'exam_sim'
  | 'role_play'
  | 'develop_answers'
  | 'weak_skill'
  | 'review'
  | 'new_topic'
  | 'keep_going';

export interface CoachMove {
  kind: CoachMoveKind;
  /** Imperative, short: "Fix your past tense". */
  title: string;
  /** One or two sentences grounded in the learner's own evidence. */
  why: string;
  cta: string;
  to: string;
  topicKey: string | null;
  skillIds: string[];
  /** True when this move spends one of today's AI-marked Learn answers. */
  usesLearnAnswer: boolean;
  /** Ranking score; higher wins. Exposed for tests and the debug screen. */
  priority: number;
}

export interface CoachStep {
  title: string;
  sub: string;
}

export interface CoachBrief {
  phase: ExamPhase;
  daysToExam: number | null;
  /** The phase in one line ("Exam in 23 days — exam month: …"), null without an exam goal. */
  headline: string | null;
  move: CoachMove;
  /** Up to two other good options, different kinds from `move`. */
  alternatives: CoachMove[];
  /** What the chosen move will actually involve, three steps. */
  steps: CoachStep[];
  /** Short evidence chips behind the decision ("Last Exam Sim 24/40", "Past tense 42%"). */
  signals: string[];
  examAvailable: boolean;
  /** ISO time the next sample exam unlocks, when one was taken inside the window. */
  nextExamAt: string | null;
}

export interface CoachTopic {
  key: string;
  /** English label, for the learner-facing sentences. */
  labelEn: string;
  isAdvanced: boolean;
  /** Questions in this topic that practise each coach skill id (skillStructures.ts). */
  skillCoverage: Record<string, number>;
  questionsCount: number;
}

export interface CoachTopicStats {
  sessionsCompleted: number;
  averageScore: number | null;
  lastSessionAt: string | null;
}

export interface CoachInput {
  now: number;
  goalType: CoachGoalType | null;
  examDate: string | null;
  /** Newest first, as getSessionHistory returns them. */
  sessions: StoredSession[];
  skills: Record<string, EvidenceDerivedSkillBelief>;
  weakestSkillIds: string[];
  skillLabel: (id: string) => string;
  /** The node of an unresolved recurring-grammar problem (not a demand:* one). */
  activeProblemNodeId: string | null;
  /** The skill the recommendation engine is currently steering Learn toward (Learn's focusedSkillId). */
  focusSkillId: string | null;
  dueCounts: Record<string, number>;
  /** Only topics the learner can open from Learn's grid (visible and unlocked). */
  topics: CoachTopic[];
  topicStats: Record<string, CoachTopicStats>;
  /** AI-marked Learn answers left today; null while unknown. */
  learnAnswersLeft: number | null;
  /**
   * learner-model §5 (flag `learnerModelCoach`): the three 0520 areas from the
   * learner model — decayed over counted Exam Sim attempts only. Absent = the
   * old rule (the latest counted attempt, if fresh). When present, the weakest
   * area is chosen from it and the copy says "across your recent Exam Sims".
   */
  examStanding?: CoachExamStanding[];
}

/** One area of the learner model's exam standing (domain/learnerModel/read.ts ExamAreaReading). */
export interface CoachExamStanding {
  key: ExamAreaKey;
  /** Decayed share of the area's marks across counted attempts (0–1). */
  mastery: number;
  lastMark: number;
  lastMax: number;
}

/** The weak area the moves talk about, and which rule chose it. */
type WeakArea = ExamArea & { basis: 'latest' | 'recent'; share: number };

const AREA_LABEL: Record<ExamAreaKey, string> = {
  rolePlay: 'Role play',
  communication: 'Communication',
  qualityOfLanguage: 'Quality of language',
};

/** The model's weakest area when the learner model is the reader, else the fresh latest attempt's. */
function chooseWeakArea(standing: CoachExamStanding[] | undefined, latestWeakest: ExamArea | null): WeakArea | null {
  if (standing !== undefined) {
    let weakest: CoachExamStanding | null = null;
    for (const a of standing) if (!weakest || a.mastery < weakest.mastery) weakest = a;
    if (!weakest || weakest.mastery >= WEAK_AREA_RATIO || !(weakest.lastMax > 0)) return null;
    return { key: weakest.key, label: AREA_LABEL[weakest.key], mark: weakest.lastMark, max: weakest.lastMax, basis: 'recent', share: weakest.mastery };
  }
  if (latestWeakest && latestWeakest.mark / latestWeakest.max < WEAK_AREA_RATIO) {
    return { ...latestWeakest, basis: 'latest', share: latestWeakest.mark / latestWeakest.max };
  }
  return null;
}

/** "Role play was your weakest area in your last Exam Sim (6/15)" — or the model's "across your recent Exam Sims" form. */
function weakAreaSentence(label: string, a: WeakArea): string {
  return a.basis === 'latest'
    ? `${label} was your weakest area in your last Exam Sim (${a.mark}/${a.max})`
    : `${label} has been your weakest area across your recent Exam Sims (about ${pct(a.share)}% of its marks; ${a.mark}/${a.max} last time)`;
}

/** How hard to push the weekly Exam Sim in each phase (the closer the exam, the more it matters). */
const EXAM_SIM_PRIORITY: Partial<Record<ExamPhase, number>> = {
  final_week: 95, exam_month: 88, sharpen: 72, build: 58, no_date: 65,
};
/** How much an unpractised topic matters: most while building, least in the final week. */
const NEW_TOPIC_PRIORITY: Record<ExamPhase, number> = {
  build: 62, sharpen: 55, no_date: 52, exam_month: 45, final_week: 20, after_exam: 35, no_exam: 40,
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const EXAM_GOALS: ReadonlySet<CoachGoalType> = new Set(['igcse', 'gcse', 'delf']);

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function pct(x: number): number {
  return Math.round(x * 100);
}

export function daysUntil(examDate: string | null, now: number): number | null {
  if (!examDate) return null;
  const t = new Date(examDate).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - now) / DAY_MS);
}

export function examPhase(goalType: CoachGoalType | null, days: number | null): ExamPhase {
  if (!goalType || !EXAM_GOALS.has(goalType)) return 'no_exam';
  if (days === null) return 'no_date';
  if (days < 0) return 'after_exam';
  if (days <= 7) return 'final_week';
  if (days <= 28) return 'exam_month';
  if (days <= 84) return 'sharpen';
  return 'build';
}

function phaseHeadline(phase: ExamPhase, days: number | null): string | null {
  const weeks = days !== null ? Math.round(days / 7) : 0;
  switch (phase) {
    case 'final_week':
      return days === 0
        ? 'Exam day. Warm up gently, speak slowly and develop every answer.'
        : `Exam in ${plural(days ?? 0, 'day')} — final week: full run-throughs and confidence, no new grammar.`;
    case 'exam_month':
      return `Exam in ${days} days — exam month: one Exam Sim a week, role plays, and fix what costs you marks.`;
    case 'sharpen':
      return `${weeks} weeks to your exam — sharpen: fix your biggest weakness and keep every topic warm.`;
    case 'build':
      return `${weeks} weeks to your exam — build: cover every topic and get comfortable in past, present and future.`;
    case 'no_date':
      return 'No exam date yet — add it in Profile and I’ll plan your weeks around it.';
    case 'after_exam':
      return 'Your exam date has passed — set a new one in Profile if another exam is coming.';
    default:
      return null;
  }
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** The visible topic whose questions practise this skill most; ties go to the lower average, then the less practised. */
export function bestTopicForSkill(
  skillId: string,
  topics: CoachTopic[],
  stats: Record<string, CoachTopicStats>,
): CoachTopic | null {
  const ranked = topics
    .filter(t => (t.skillCoverage[skillId] ?? 0) > 0)
    .sort((a, b) => {
      const cov = (b.skillCoverage[skillId] ?? 0) - (a.skillCoverage[skillId] ?? 0);
      if (cov !== 0) return cov;
      const avgA = stats[a.key]?.averageScore ?? 10;
      const avgB = stats[b.key]?.averageScore ?? 10;
      if (avgA !== avgB) return avgA - avgB;
      return (stats[a.key]?.sessionsCompleted ?? 0) - (stats[b.key]?.sessionsCompleted ?? 0);
    });
  return ranked[0] ?? null;
}

function lowestAverageTopic(topics: CoachTopic[], stats: Record<string, CoachTopicStats>): CoachTopic | null {
  return topics
    .filter(t => typeof stats[t.key]?.averageScore === 'number')
    .sort((a, b) => (stats[a.key].averageScore as number) - (stats[b.key].averageScore as number))[0] ?? null;
}

function mostRecentTopic(topics: CoachTopic[], stats: Record<string, CoachTopicStats>): CoachTopic | null {
  const t = (k: string) => {
    const v = new Date(stats[k]?.lastSessionAt ?? 0).getTime();
    return Number.isFinite(v) ? v : 0;
  };
  return topics.filter(x => (stats[x.key]?.sessionsCompleted ?? 0) > 0).sort((a, b) => t(b.key) - t(a.key))[0] ?? null;
}

function topicPath(topic: CoachTopic | null): string {
  return topic ? learnTopicPath(topic.key) : '/learn';
}

// ── The decision ──────────────────────────────────────────────────────────────

export function decideCoachBrief(input: CoachInput): CoachBrief {
  const { now, sessions, skills, topics, topicStats: stats, skillLabel } = input;
  const days = daysUntil(input.examDate, now);
  const phase = examPhase(input.goalType, days);
  const examGoal = phase !== 'no_exam';

  const learnAnswers = sessions.filter(s => s.mode === 'practice');
  const anyExam = sessions.find(s => s.mode === 'exam') ?? null;
  const windowMs = EXAM_WINDOW_DAYS * DAY_MS;
  const lastExamAt = anyExam ? new Date(anyExam.date).getTime() : null;
  const examAvailable = lastExamAt === null || !Number.isFinite(lastExamAt) || now - lastExamAt >= windowMs;
  const nextExamAt = !examAvailable && lastExamAt !== null ? new Date(lastExamAt + windowMs).toISOString() : null;

  const exam = examSummary(sessions);
  const latest = exam.latestWithAreas;
  const latestFresh = latest !== null && now - new Date(latest.date).getTime() <= EXAM_RESULT_FRESH_DAYS * DAY_MS;
  const weakArea: WeakArea | null = chooseWeakArea(input.examStanding, latestFresh ? exam.weakestArea : null);

  const dueTotal = Object.values(input.dueCounts).reduce((a, b) => a + b, 0);
  const answersGone = input.learnAnswersLeft === 0;
  const late = phase === 'exam_month' || phase === 'final_week';

  const candidates: CoachMove[] = [];
  const add = (m: CoachMove) => candidates.push(m);

  // 1. Nothing on record yet.
  if (learnAnswers.length === 0 && !anyExam) {
    add({
      kind: 'first_steps',
      title: 'Answer your first question',
      why: 'Pick a topic and speak for about 30 seconds. After a few answers I’ll know what to work on first.',
      cta: 'Start in Learn',
      to: '/learn',
      topicKey: null,
      skillIds: [],
      usesLearnAnswer: true,
      priority: 100,
    });
  }

  // 2. A tracked recurring mistake beats everything except the exam itself in its final week.
  if (input.activeProblemNodeId) {
    const id = input.activeProblemNodeId;
    const label = skillLabel(id);
    const topic = bestTopicForSkill(id, topics, stats);
    const belief = skills[id];
    add({
      kind: 'fix_mistake',
      title: `Fix ${label}`,
      why: `${label} has gone wrong in several recent answers${belief ? ` (about ${pct(belief.mastery)}% right)` : ''}, so I’m tracking it until it’s fixed.${
        topic ? ` ${topic.labelEn} has ${plural(topic.skillCoverage[id], 'question')} that make you use it.` : ''
      }`,
      cta: topic ? `Practise in ${topic.labelEn}` : 'Practise it',
      to: topicPath(topic),
      topicKey: topic?.key ?? null,
      skillIds: [id],
      usesLearnAnswer: true,
      priority: 90,
    });
  }

  // 3. The weekly Exam Sim — the only real measure of exam progress.
  if (examGoal && phase !== 'after_exam' && examAvailable) {
    const neverSat = exam.counted.length === 0 && !anyExam;
    const base = EXAM_SIM_PRIORITY[phase] ?? 60;
    const warmedUp = learnAnswers.length >= FIRST_EXAM_AFTER_ANSWERS;
    const trend = exam.counted.length >= 2
      ? ` Your last two: ${exam.counted[1].total} → ${exam.counted[0].total}/40.`
      : exam.counted.length === 1 ? ` Last time you scored ${exam.counted[0].total}/40.` : '';
    add({
      kind: 'exam_sim',
      title: neverSat ? 'Sit your first Exam Sim' : 'Sit this week’s Exam Sim',
      why: neverSat
        ? 'A full 0520 speaking exam, marked out of 40. It gives us your baseline — every plan after it is built on real exam marks.'
        : `You get one sample exam every ${EXAM_WINDOW_DAYS} days and this week’s is ready.${trend}`,
      cta: 'Start Exam Sim',
      to: '/exam',
      topicKey: null,
      skillIds: [],
      usesLearnAnswer: false,
      priority: (neverSat ? (warmedUp ? base + 8 : 50) : base) + (answersGone ? 10 : 0),
    });
  }

  // 4. Role-play drill: the fix for a weak role play, and the best use of time when Learn is spent.
  {
    const rp = weakArea?.key === 'rolePlay';
    const finalNoExam = phase === 'final_week' && !examAvailable;
    add({
      kind: 'role_play',
      title: 'Drill role plays',
      why: rp
        ? `${weakAreaSentence('Role play', weakArea)}. Each task wants a full answer to every part — drilling the cards is the fastest fix.`
        : finalNoExam
          ? 'Final week: role plays are quick, familiar wins — and they don’t use today’s marked answers.'
          : answersGone
            ? 'You’ve used today’s marked Learn answers. Role-play cards don’t count against them, so keep speaking here.'
            : 'Short, exam-style situations. Good practice for answering every part of a task.',
      cta: 'Practise role play',
      to: '/exam/role-play',
      topicKey: null,
      skillIds: [],
      usesLearnAnswer: false,
      priority: rp ? 82 + (late ? 5 : 0) : finalNoExam ? 80 : answersGone ? 72 : 35,
    });
  }

  // 5. Weak Communication: longer, developed answers.
  if (weakArea?.key === 'communication') {
    const topic = lowestAverageTopic(topics, stats) ?? mostRecentTopic(topics, stats) ?? topics[0] ?? null;
    add({
      kind: 'develop_answers',
      title: 'Develop your answers',
      why: `${weakAreaSentence('Communication', weakArea)}. Those marks come from developed answers: give an opinion, say why, and add a past or future example.`,
      cta: topic ? `Practise in ${topic.labelEn}` : 'Practise in Learn',
      to: topicPath(topic),
      topicKey: topic?.key ?? null,
      skillIds: [],
      usesLearnAnswer: true,
      priority: 78 + (late ? 4 : 0),
    });
  }

  // 6. The weakest skill, routed to the topic that actually practises it.
  {
    const preferred = input.focusSkillId && skills[input.focusSkillId] ? input.focusSkillId : null;
    const id = preferred ?? input.weakestSkillIds.find(x => skills[x]) ?? null;
    const belief = id ? skills[id] : null;
    if (id && belief && belief.mastery < WEAK_SKILL_MASTERY && belief.evidenceCount >= WEAK_SKILL_MIN_EVIDENCE && id !== input.activeProblemNodeId) {
      const label = skillLabel(id);
      const topic = bestTopicForSkill(id, topics, stats) ?? lowestAverageTopic(topics, stats);
      const covered = topic ? (topic.skillCoverage[id] ?? 0) > 0 : false;
      const slipping = belief.trend === 'declining';
      const avoided = belief.avoidanceScore > 0.3;
      const qol = weakArea?.key === 'qualityOfLanguage';
      let why = `${label} is your weakest area — about ${pct(belief.mastery)}% right across ${plural(belief.evidenceCount, 'answer')}${slipping ? ', and it’s slipping' : ''}.`;
      if (avoided) why += ' You also tend to steer around it when a question invites it.';
      if (qol) {
        why += weakArea.basis === 'latest'
          ? ` Quality of language was your lowest exam area (${weakArea.mark}/${weakArea.max}), and this is where it leaks.`
          : ` Quality of language has been your lowest exam area recently (about ${pct(weakArea.share)}% of its marks), and this is where it leaks.`;
      }
      if (topic && covered) why += ` ${topic.labelEn} has the most questions that need it.`;
      add({
        kind: 'weak_skill',
        title: `Practise ${label}`,
        why,
        cta: topic ? `Practise in ${topic.labelEn}` : 'Practise in Learn',
        to: topicPath(topic),
        topicKey: topic?.key ?? null,
        skillIds: [id],
        usesLearnAnswer: true,
        priority: 68 + Math.round((WEAK_SKILL_MASTERY - belief.mastery) * 40) + (slipping ? 8 : 0) + (avoided ? 4 : 0) + (qol ? 8 : 0),
      });
    }
  }

  // 7. Spaced review that is due.
  if (dueTotal > 0) {
    const [key, n] = Object.entries(input.dueCounts).filter(([k, v]) => v > 0 && topics.some(t => t.key === k))
      .sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    const topic = topics.find(t => t.key === key) ?? null;
    if (topic) {
      add({
        kind: 'review',
        title: `Review ${topic.labelEn}`,
        why: `${plural(n, 'answer')} from ${topic.labelEn} ${n === 1 ? 'is' : 'are'} due. Coming back just before you’d forget is what makes it stick.`,
        cta: 'Start review',
        to: topicPath(topic),
        topicKey: topic.key,
        skillIds: [],
        usesLearnAnswer: true,
        priority: 60 + Math.min(n, 5) * 3,
      });
    }
  }

  // 8. Breadth: the exam's conversations can come from any topic area.
  {
    const core = topics.filter(t => !t.isAdvanced);
    const unpractised = core.filter(t => (stats[t.key]?.sessionsCompleted ?? 0) === 0)
      .sort((a, b) => b.questionsCount - a.questionsCount);
    if (unpractised.length > 0 && learnAnswers.length > 0) {
      const topic = unpractised[0];
      const practised = core.length - unpractised.length;
      const base = NEW_TOPIC_PRIORITY[phase];
      add({
        kind: 'new_topic',
        title: `Start ${topic.labelEn}`,
        why: examGoal
          ? `You haven’t spoken about ${topic.labelEn} yet (${practised} of ${core.length} topics so far). The exam’s conversations can come from any topic area, so an unpractised topic is a risk.`
          : `Something new: you haven’t tried ${topic.labelEn} yet (${practised} of ${core.length} topics so far).`,
        cta: `Try ${topic.labelEn}`,
        to: topicPath(topic),
        topicKey: topic.key,
        skillIds: [],
        usesLearnAnswer: true,
        priority: base,
      });
    }
  }

  // 9. Fallback: keep going where you were.
  {
    const topic = mostRecentTopic(topics, stats) ?? lowestAverageTopic(topics, stats);
    add({
      kind: 'keep_going',
      title: topic ? `Keep going with ${topic.labelEn}` : 'Speak a little French',
      why: topic
        ? `Nothing urgent stands out, so build on ${topic.labelEn}${typeof stats[topic.key]?.averageScore === 'number' ? ` (average ${(stats[topic.key].averageScore as number).toFixed(1)}/10)` : ''} — one step harder than last time.`
        : 'A short session at your level.',
      cta: topic ? `Practise ${topic.labelEn}` : 'Go to Learn',
      to: topicPath(topic),
      topicKey: topic?.key ?? null,
      skillIds: [],
      usesLearnAnswer: true,
      priority: 30,
    });
  }

  // Never lead with something that can't be started today.
  if (answersGone) for (const c of candidates) if (c.usesLearnAnswer) c.priority -= 60;

  candidates.sort((a, b) => b.priority - a.priority);
  const move = candidates[0];
  const alternatives: CoachMove[] = [];
  for (const c of candidates.slice(1)) {
    if (alternatives.length >= 2) break;
    if (c.kind === move.kind || alternatives.some(a => a.kind === c.kind)) continue;
    if (c.kind === 'keep_going' && alternatives.length > 0) continue;
    alternatives.push(c);
  }

  return {
    phase,
    daysToExam: days,
    headline: phaseHeadline(phase, days),
    move,
    alternatives,
    steps: stepsFor(move, skillLabel, input.dueCounts),
    signals: buildSignals({ phase, days, exam, weakArea, move, skills, skillLabel, dueTotal, learnAnswersLeft: input.learnAnswersLeft, nextExamAt, examGoal }),
    examAvailable,
    nextExamAt,
  };
}

function stepsFor(move: CoachMove, skillLabel: (id: string) => string, dueCounts: Record<string, number>): CoachStep[] {
  switch (move.kind) {
    case 'exam_sim':
      return [
        { title: 'Prepare', sub: '10 minutes with the role-play card' },
        { title: 'Role play', sub: 'Five tasks with the examiner' },
        { title: 'Conversations', sub: 'Two topics, marked out of 40' },
      ];
    case 'role_play':
      return [
        { title: 'Pick a card', sub: 'An exam-style situation' },
        { title: 'Every task', sub: 'Answer every part of each one' },
        { title: 'Feedback', sub: 'What a full answer needed' },
      ];
    case 'develop_answers':
      return [
        { title: 'Warm up', sub: 'A question at your level' },
        { title: 'Develop', sub: 'Opinion, reason, example' },
        { title: 'Stretch', sub: 'Add a past or future time frame' },
      ];
    case 'fix_mistake':
    case 'weak_skill': {
      const label = move.skillIds[0] ? skillLabel(move.skillIds[0]) : 'your focus';
      return [
        { title: 'Warm up', sub: 'A question at your level' },
        { title: 'Target', sub: `A question that needs ${label}` },
        { title: 'Stretch', sub: 'A step above your level' },
      ];
    }
    case 'review': {
      const n = move.topicKey ? dueCounts[move.topicKey] ?? 0 : 0;
      return [
        { title: 'Warm up', sub: 'A question at your level' },
        { title: 'Review', sub: `${plural(n, 'answer')} due` },
        { title: 'Stretch', sub: 'A step above your level' },
      ];
    }
    case 'new_topic':
      return [
        { title: 'First look', sub: 'An easy opener on the topic' },
        { title: 'Build on it', sub: 'Same topic, one step on' },
        { title: 'Stretch', sub: 'A step above your level' },
      ];
    default:
      return [
        { title: 'Warm up', sub: 'A question at your level' },
        { title: 'Build on it', sub: 'Same topic, one step on' },
        { title: 'Stretch', sub: 'A step above your level' },
      ];
  }
}

function buildSignals(a: {
  phase: ExamPhase;
  days: number | null;
  exam: ReturnType<typeof examSummary>;
  weakArea: WeakArea | null;
  move: CoachMove;
  skills: Record<string, EvidenceDerivedSkillBelief>;
  skillLabel: (id: string) => string;
  dueTotal: number;
  learnAnswersLeft: number | null;
  nextExamAt: string | null;
  examGoal: boolean;
}): string[] {
  const out: string[] = [];
  if (a.days !== null && a.days >= 0 && a.examGoal) out.push(a.days === 0 ? 'Exam today' : `Exam in ${plural(a.days, 'day')}`);
  if (a.exam.counted.length > 0) out.push(`Last Exam Sim ${a.exam.counted[0].total}/40`);
  if (a.weakArea) {
    out.push(a.weakArea.basis === 'latest'
      ? `Weakest exam area: ${a.weakArea.label} ${a.weakArea.mark}/${a.weakArea.max}`
      : `Weakest exam area: ${a.weakArea.label} ~${pct(a.weakArea.share)}%`);
  }
  const skillId = a.move.skillIds[0];
  const belief = skillId ? a.skills[skillId] : undefined;
  if (skillId && belief) out.push(`${a.skillLabel(skillId)} ${pct(belief.mastery)}%${belief.trend === 'declining' ? ', slipping' : belief.trend === 'improving' ? ', improving' : ''}`);
  if (a.dueTotal > 0 && a.move.kind !== 'review') out.push(`${plural(a.dueTotal, 'review')} due`);
  if (a.learnAnswersLeft === 0) out.push('Today’s marked answers used');
  if (a.nextExamAt && a.examGoal && a.phase !== 'after_exam') out.push(`Next Exam Sim ${formatDay(a.nextExamAt)}`);
  return out.slice(0, 4);
}
