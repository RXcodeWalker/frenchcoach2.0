import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, CalendarCheck, ChevronRight, GraduationCap, Lock, MessagesSquare, Shuffle, Timer, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced, stagger } from '../../components/motion/variants';
import { STORY_CARDS } from '../../data/storyCards';
import { listPublishedQuestionSetsWithRetry, getOfflineAuthoredSets } from '../../data/exam/bank/loader';
import type { AuthoredQuestionSet, Difficulty } from '../../data/exam/bank/types';
import { examLimitMessage, getExamAllowance, type ExamAllowance } from '../../services/exam/scoringApiClient';
import { PremiumLink } from '../../features/premium/PremiumLink';

const TOPIC_AREA_LABEL: Record<string, string> = {
  A: 'Everyday Activities',
  B: 'Personal & Social Life',
  C: 'World Around Us',
  D: 'World of Work',
  E: 'International World',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  foundation: 'Foundation',
  core: 'Core',
  higher: 'Higher',
};

/** Rough difficulty summary for a topic — most common `difficulty` among its authored questions. */
function dominantDifficulty(set: AuthoredQuestionSet): Difficulty | undefined {
  const counts: Partial<Record<Difficulty, number>> = {};
  for (const topic of [set.content.topic1, set.content.topic2]) {
    for (const q of topic.questions) {
      if (q.difficulty) counts[q.difficulty] = (counts[q.difficulty] ?? 0) + 1;
    }
  }
  const entries = Object.entries(counts) as [Difficulty, number][];
  if (entries.length === 0) return undefined;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface Props {
  onSelect: (set: AuthoredQuestionSet, coached: boolean) => void;
  onAutoFallback: (coached: boolean) => void;
  /** Batch 3 resume guard: a one-line notice shown once (e.g. a discarded resume snapshot). */
  notice?: string | null;
  onDismissNotice?: () => void;
  /** Opens the Role-play drill (`/exam/role-play`); the entry is hidden without it. */
  onRolePlayDrill?: () => void;
  /** Opens the exam guide (`/exam/guide`); the entry is hidden without it. */
  onGuide?: () => void;
  /**
   * A mock exam a teacher set (features/homework). Locks the mode to Exam Sim and uses the
   * homework's own allowance, so it is never blocked by the learner's weekly exam.
   */
  homework?: { assignmentId: string; title: string; teacherName: string } | null;
  /**
   * Junior-tab learners unlock Exam after finishing missions (any outcomes).
   * Homework bypasses this. Default open.
   */
  examLocked?: { done: number; need: number } | null;
  /** The toggle's starting position (`/exam?mode=coached`, features/exam/examDeepLink.ts). Default Exam Sim. */
  initialMode?: 'coached' | 'sim';
  /** The newest counted Exam Sim (stored history), shown on the Exam Sim card as the score to beat. */
  lastExam?: { total: number; date: string } | null;
}

type ExamModeChoice = 'coached' | 'sim';

const MODE_COPY: Record<ExamModeChoice, { label: string; blurb: string; icon: typeof Timer }> = {
  coached: { label: 'Coached Practice', blurb: 'Commentary, typing and edits allowed — your /40 is a practice mark and doesn’t count', icon: GraduationCap },
  sim: { label: 'Exam Sim', blurb: 'Microphone only, no commentary, no edits — exactly like the real exam, and your /40 counts', icon: Timer },
};

/** exam-conduct §1 (TN p.1, p.3; Syl p.19): the paper's three parts and their rough timings. */
const PAPER_PARTS = [
  { label: 'Role play', meta: '≈ 2 min' },
  { label: 'Topic 1', meta: '≈ 4 min' },
  { label: 'Topic 2', meta: '≈ 4 min' },
];

// The remote catalog rides out a Render free-tier cold start (up to ~45s) in the
// background. Rather than block the whole screen on a spinner for that long, we
// render the bundled offline exam immediately and swap in the full catalog once
// it arrives — or keep the offline set if the backend is genuinely unreachable.
type RemoteState =
  | { phase: 'loading' }
  | { phase: 'ready'; sets: AuthoredQuestionSet[] }
  | { phase: 'offline-only' };

export function ExamSelect({ onSelect, onAutoFallback, notice, onDismissNotice, onRolePlayDrill, onGuide, homework, examLocked = null, initialMode = 'sim', lastExam = null }: Props) {
  const reduced = useReducedMotion() ?? false;
  const v = reduced ? enterReduced : enter;
  const lastExamDate = lastExam ? shortDate(lastExam.date) : '';
  // Available synchronously — no network — so a card is on screen from the first paint.
  const offlineSets = useMemo(() => getOfflineAuthoredSets(), []);
  const [remote, setRemote] = useState<RemoteState>({ phase: 'loading' });
  // Bumped on manual retry to re-run the fetch effect below without remounting the screen.
  const [retryCount, setRetryCount] = useState(0);
  // W5: Coached Practice (rail live every turn) vs Exam Sim (rail sealed until
  // submission) — see simulationSession.ts's `coached` flag. Step 5: defaults
  // to Exam Sim, so a candidate who doesn't notice the toggle still gets a
  // mark that counts.
  const [chosenMode, setMode] = useState<ExamModeChoice>(initialMode);
  const mode: ExamModeChoice = homework ? 'sim' : chosenMode;
  const isSim = mode === 'sim';
  const homeworkId = homework?.assignmentId ?? null;
  // Launch limit: one sample exam per rolling 7 days (server GET /exam/allowance). Unknown
  // (null) lets the learner start; POST /score enforces the same rule.
  const [allowance, setAllowance] = useState<ExamAllowance | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getExamAllowance(homeworkId).then((a) => {
      if (!cancelled) setAllowance(a);
    });
    return () => {
      cancelled = true;
    };
  }, [homeworkId]);
  const weeklyLimitReached = allowance !== null && !allowance.allowed;

  // exam-conduct §4 (D4): Exam Sim never shows which sets exist before the
  // test starts — the candidate gets the existing uniform-random pick
  // instead, the same "Surprise Me" path Coached also offers. Only Coached
  // fetches and renders the catalog, since only Coached lets the candidate
  // choose a specific set.
  useEffect(() => {
    if (isSim) return;
    let cancelled = false;
    setRemote({ phase: 'loading' });
    listPublishedQuestionSetsWithRetry()
      .then(({ sets, source }) => {
        if (cancelled) return;
        // A real catalog with content replaces the offline placeholder; anything
        // else (fetch fell back to the fixture, or an empty catalog) means the
        // backend never really answered — keep showing the offline set.
        if (source === 'remote' && sets.length > 0) {
          setRemote({ phase: 'ready', sets });
        } else {
          setRemote({ phase: 'offline-only' });
        }
      })
      .catch(() => {
        if (!cancelled) setRemote({ phase: 'offline-only' });
      });
    return () => {
      cancelled = true;
    };
  }, [retryCount, isSim]);

  const sets = remote.phase === 'ready' ? remote.sets : offlineSets;

  return (
    <div className="min-h-screen bg-bg pb-24 md:pb-8">
      <motion.div
        className="mx-auto max-w-3xl space-y-5 px-4 pt-6 md:px-6 md:pt-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {notice && (
          <div className="flex items-start justify-between gap-3 rounded-card border border-hairline bg-reward-soft p-4">
            <p className="text-body-s text-ink-muted">{notice}</p>
            {onDismissNotice && (
              <button onClick={onDismissNotice} aria-label="Dismiss" className="shrink-0 text-ink-subtle transition-colors duration-state hover:text-ink">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {homework && (
          <div className="rounded-card border border-hairline bg-surface p-4" role="status" data-testid="exam-homework-banner">
            <p className="text-eyebrow uppercase text-ink-subtle">Homework from {homework.teacherName}</p>
            <p className="mt-1 text-section text-ink">{homework.title}</p>
            <p className="mt-1 text-body-s text-ink-muted">
              This mock exam runs as Exam Sim and your teacher will see the mark. It doesn't use up your own weekly exam.
            </p>
          </div>
        )}

        <motion.div variants={v}>
          <p className="text-eyebrow uppercase text-ink-subtle">Speaking · Paper 3</p>
          <h1 className="mt-1 text-display-m text-ink">Choose an Exam</h1>
          <p className="mt-1 text-body-s text-ink-muted">
            {isSim
              ? 'Exam Sim runs like the real test: your set is chosen for you, and you won’t see its topics until each conversation starts.'
              : 'Pick one of the Cambridge-style mock exams below.'}
          </p>
        </motion.div>

        {onGuide && <ExamGuideEntry onOpen={onGuide} />}

        {examLocked && !homework ? (
          <div className="space-y-2 rounded-card border border-hairline bg-surface p-6 text-center" role="status" data-testid="exam-locked">
            <Lock size={22} className="mx-auto text-ink-subtle" aria-hidden="true" />
            <p className="text-section text-ink">Exam practice opens after Junior missions</p>
            <p className="text-body-s text-ink-muted">
              Finish {examLocked.need} missions with Léo to open a mock exam. You have finished {examLocked.done}. Finishing counts — not getting every answer right.
            </p>
          </div>
        ) : weeklyLimitReached ? (
          <div className="space-y-1.5 rounded-card border border-hairline bg-surface p-6 text-center" role="status">
            <CalendarCheck size={22} className="mx-auto text-progress-text" aria-hidden="true" />
            <p className="text-section text-ink">{allowance?.premium ? "Today's mock exams are done" : "This week's sample exam is done"}</p>
            <p className="text-body-s text-ink-muted">{examLimitMessage(allowance)}</p>
            {!allowance?.premium && <PremiumLink>Take a mock exam every day with Premium</PremiumLink>}
          </div>
        ) : (
        <>
        {!homework && (
          <motion.div variants={v} role="group" aria-label="Exam mode" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(MODE_COPY) as ExamModeChoice[]).map((m) => {
              const on = mode === m;
              const Icon = MODE_COPY[m].icon;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={on}
                  className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors duration-state ease-smooth active:scale-[.97] ${
                    on ? 'border-action bg-action-soft' : 'border-hairline bg-surface hover:border-hairline-strong'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${on ? 'bg-action text-action-ink' : 'surface-recessed text-ink-muted'}`}
                    aria-hidden="true"
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-section ${on ? 'text-action-text' : 'text-ink'}`}>{MODE_COPY[m].label}</span>
                    <span className="mt-0.5 block text-caption text-ink-muted">{MODE_COPY[m].blurb}</span>
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}

        {isSim ? (
          <motion.div variants={v} className="rounded-card border border-hairline-strong bg-surface-raised p-5 shadow-card sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-eyebrow uppercase text-ink-subtle">About 10 minutes, plus preparation</p>
                <h2 className="mt-1 text-title text-ink">The full speaking exam</h2>
              </div>
              <span className="shrink-0 rounded-pill bg-progress-soft px-2.5 py-0.5 text-label text-progress-text">Counts</span>
            </div>
            <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="The paper">
              {PAPER_PARTS.map((part, i) => (
                <li key={part.label} className="rounded-control surface-recessed p-3">
                  <span className="font-numeral text-caption text-ink-subtle">0{i + 1}</span>
                  <p className="mt-0.5 text-label text-ink">{part.label}</p>
                  <p className="text-caption text-ink-muted">{part.meta}</p>
                </li>
              ))}
            </ol>
            {lastExam && (
              <p className="mt-3 text-caption text-ink-muted" data-testid="exam-last-result">
                Your last counted Exam Sim: <span className="font-numeral font-semibold text-ink">{lastExam.total}/40</span>
                {lastExamDate ? ` on ${lastExamDate}` : ''}. Can you beat it?
              </p>
            )}
            <Button variant="primary" size="lg" className="mt-4 w-full" onClick={() => onAutoFallback(false)}>
              Start Exam Sim
            </Button>
            <p className="mt-2 text-center text-caption text-ink-subtle">
              A set is picked for you. Its role play and topics stay hidden until you reach them.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {sets.map((set) => {
                const difficulty = dominantDifficulty(set);
                return (
                  <motion.button
                    key={set.questionSetId}
                    variants={v}
                    onClick={() => onSelect(set, mode === 'coached')}
                    className="rounded-card border border-hairline bg-surface p-4 text-left transition-colors duration-state ease-smooth hover:border-hairline-strong active:scale-[.97]"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-section text-ink">{set.content.rolePlay.title}</h3>
                      {difficulty && (
                        <span className="shrink-0 rounded-pill bg-track px-2 py-0.5 text-caption text-ink-muted">{DIFFICULTY_LABEL[difficulty]}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[set.content.topic1, set.content.topic2].map((t, i) => (
                        <span key={i} className="rounded-pill bg-info-soft px-2 py-0.5 text-caption text-info-text">
                          {TOPIC_AREA_LABEL[t.topicArea] ?? t.topicArea}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-caption text-ink-subtle">
                      {set.content.topic1.subTopic} &middot; {set.content.topic2.subTopic}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            {remote.phase === 'loading' && (
              <div className="flex items-center gap-3 rounded-card border border-dashed border-hairline-strong p-4" role="status">
                <span className="h-5 w-5 shrink-0 animate-spin rounded-pill border-2 border-action-soft border-t-action" aria-hidden="true" />
                <div>
                  <p className="text-label text-ink">Loading the other exams…</p>
                  <p className="mt-0.5 text-caption text-ink-muted">
                    The server is waking up, which can take up to a minute. This only happens the first
                    time — you can start the practice exam above right now. Thanks for your patience!
                  </p>
                </div>
              </div>
            )}

            {remote.phase === 'offline-only' && (
              <div className="flex items-center justify-between gap-3 rounded-card border border-dashed border-hairline-strong p-4">
                <div>
                  <p className="text-label text-ink">Offline mode</p>
                  <p className="mt-0.5 text-caption text-ink-muted">
                    We couldn't reach the exam catalog, so only the offline practice exam above is
                    available right now. Everything still works — your session runs and is scored locally.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setRetryCount((n) => n + 1)}>
                  Try again
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onAutoFallback(mode === 'coached')}
              className="flex w-full items-center gap-3 rounded-card border border-dashed border-hairline-strong p-4 text-left transition-colors duration-state ease-smooth hover:bg-track active:scale-[.97]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
                <Shuffle size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-section text-ink">Surprise Me</span>
                <span className="block text-caption text-ink-muted">Get a random exam</span>
              </span>
            </button>
          </>
        )}
        </>
        )}

        {onRolePlayDrill && <RolePlayDrillEntry onOpen={onRolePlayDrill} limitReached={weeklyLimitReached} />}
      </motion.div>
    </div>
  );
}

/**
 * The way into the exam guide (`/exam/guide`): how the test runs, how it is
 * marked and how to answer, before a first attempt. Shown in both modes.
 */
function ExamGuideEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="exam-guide-entry"
      className="flex w-full items-center gap-4 rounded-card border border-hairline bg-action-soft p-4 text-left
        transition-[border-color,transform] duration-state ease-smooth hover:border-hairline-strong active:scale-[.97]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-action text-action-ink" aria-hidden="true">
        <BookOpen size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-section text-ink">New to the speaking exam? Start here</span>
        <span className="text-body-s text-ink-muted">
          How the exam works, how it’s marked and how to answer each part, in six short chapters with a quick check at the end.
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden="true" />
    </button>
  );
}

/**
 * The way into the Role-play drill (`/exam/role-play`): Part 1 on its own,
 * practice only. Shown in both modes and when the weekly exam is used up —
 * it is the thing to do in the meantime.
 */
function RolePlayDrillEntry({ onOpen, limitReached }: { onOpen: () => void; limitReached: boolean }) {
  return (
    <section aria-labelledby="exam-practise-part" className="flex flex-col gap-3 pt-2">
      <div>
        <h2 id="exam-practise-part" className="text-section text-ink">Practise one part</h2>
        <p className="mt-1 text-body-s text-ink-muted">
          {limitReached
            ? 'Your weekly exam is used up, but you can still drill the role play in the meantime.'
            : 'Warm up on Part 1 before a full exam. It doesn’t use your weekly exam.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        data-testid="exam-role-play-drill"
        className="flex w-full items-center gap-4 rounded-card surface p-5 text-left
          transition-[border-color,transform] duration-state ease-smooth hover:border-hairline-strong active:scale-[.97]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
          <MessagesSquare size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-section text-ink">Role-play drill</span>
          <span className="text-body-s text-ink-muted">
            {STORY_CARDS.length} role-play cards, five exchanges each, with coaching on every answer. Not marked out of 40.
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden="true" />
      </button>
    </section>
  );
}
