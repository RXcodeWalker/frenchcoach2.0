import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, MessagesSquare, X } from 'lucide-react';
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
}

type ExamModeChoice = 'coached' | 'sim';

const MODE_COPY: Record<ExamModeChoice, { label: string; blurb: string }> = {
  coached: { label: 'Coached Practice', blurb: 'Commentary, typing and edits allowed — your /40 is a practice mark and doesn’t count' },
  sim: { label: 'Exam Sim', blurb: 'Microphone only, no commentary, no edits — exactly like the real exam, and your /40 counts' },
};

// The remote catalog rides out a Render free-tier cold start (up to ~45s) in the
// background. Rather than block the whole screen on a spinner for that long, we
// render the bundled offline exam immediately and swap in the full catalog once
// it arrives — or keep the offline set if the backend is genuinely unreachable.
type RemoteState =
  | { phase: 'loading' }
  | { phase: 'ready'; sets: AuthoredQuestionSet[] }
  | { phase: 'offline-only' };

export function ExamSelect({ onSelect, onAutoFallback, notice, onDismissNotice, onRolePlayDrill, onGuide, homework, examLocked = null }: Props) {
  // Available synchronously — no network — so a card is on screen from the first paint.
  const offlineSets = useMemo(() => getOfflineAuthoredSets(), []);
  const [remote, setRemote] = useState<RemoteState>({ phase: 'loading' });
  // Bumped on manual retry to re-run the fetch effect below without remounting the screen.
  const [retryCount, setRetryCount] = useState(0);
  // W5: Coached Practice (rail live every turn) vs Exam Sim (rail sealed until
  // submission) — see simulationSession.ts's `coached` flag. Step 5: defaults
  // to Exam Sim, so a candidate who doesn't notice the toggle still gets a
  // mark that counts.
  const [chosenMode, setMode] = useState<ExamModeChoice>('sim');
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
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {notice && (
          <div className="rounded-xl surface-recessed border border-amber-500/20 p-4 flex items-start justify-between gap-3">
            <p className="text-xs text-ink-muted leading-relaxed">{notice}</p>
            {onDismissNotice && (
              <button onClick={onDismissNotice} aria-label="Dismiss" className="flex-shrink-0 text-ink-subtle hover:text-ink">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {homework && (
          <div className="rounded-xl surface border border-hairline p-4" role="status" data-testid="exam-homework-banner">
            <p className="text-eyebrow uppercase text-ink-subtle">Homework from {homework.teacherName}</p>
            <p className="text-sm font-bold text-ink mt-1">{homework.title}</p>
            <p className="text-[12px] text-ink-muted mt-1">
              This mock exam runs as Exam Sim and your teacher will see the mark. It doesn't use up your own weekly exam.
            </p>
          </div>
        )}

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Choose an Exam</h1>
          <p className="text-sm text-ink-muted mt-1">
            {isSim
              ? 'Exam Sim runs like the real test: your set is chosen for you, and you won’t see its topics until each conversation starts.'
              : 'Pick one of the Cambridge-style mock exams below'}
          </p>
        </div>

        {onGuide && <ExamGuideEntry onOpen={onGuide} />}

        {examLocked && !homework ? (
          <div className="rounded-xl surface p-6 text-center space-y-2" role="status" data-testid="exam-locked">
            <p className="font-bold text-white text-sm">Exam practice opens after Junior missions</p>
            <p className="text-[12px] text-ink-muted">
              Finish {examLocked.need} missions with Léo to open a mock exam. You have finished {examLocked.done}. Finishing counts — not getting every answer right.
            </p>
          </div>
        ) : weeklyLimitReached ? (
          <div className="rounded-xl surface p-6 text-center space-y-1" role="status">
            <p className="font-bold text-white text-sm">{allowance?.premium ? "Today's mock exams are done" : "This week's sample exam is done"}</p>
            <p className="text-[12px] text-ink-muted">{examLimitMessage(allowance)}</p>
            {!allowance?.premium && <PremiumLink>Take a mock exam every day with Premium</PremiumLink>}
          </div>
        ) : (
        <>
        {!homework && (
        <div className="rounded-xl surface-recessed p-1.5 flex gap-1.5">
          {(Object.keys(MODE_COPY) as ExamModeChoice[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`flex-1 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
                mode === m ? 'bg-navy-400 border border-white/10' : 'hover:bg-white/[0.02]'
              }`}
            >
              <p className="text-xs font-bold text-white">{MODE_COPY[m].label}</p>
              <p className="text-[10px] text-ink-subtle mt-0.5">{MODE_COPY[m].blurb}</p>
            </button>
          ))}
        </div>
        )}

        {isSim ? (
          <motion.button
            onClick={() => onAutoFallback(false)}
            className="w-full group relative overflow-hidden rounded-xl surface p-6 text-center hover:border-white/10 transition-all duration-300"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <p className="font-bold text-white text-sm">Start Exam Sim</p>
            <p className="text-[11px] text-ink-subtle mt-1">
              A set is picked for you. Its role play and topics stay hidden until you reach them.
            </p>
          </motion.button>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sets.map((set, idx) => {
                const difficulty = dominantDifficulty(set);
                return (
                  <motion.button
                    key={set.questionSetId}
                    onClick={() => onSelect(set, mode === 'coached')}
                    className="group relative overflow-hidden rounded-xl surface p-5 text-left hover:border-white/10 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-white text-sm">{set.content.rolePlay.title}</h3>
                        {difficulty && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-navy-400 text-ink-muted">
                            {DIFFICULTY_LABEL[difficulty]}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink-subtle">
                        {TOPIC_AREA_LABEL[set.content.topic1.topicArea] ?? set.content.topic1.topicArea} &middot;{' '}
                        {TOPIC_AREA_LABEL[set.content.topic2.topicArea] ?? set.content.topic2.topicArea}
                      </p>
                      <p className="text-[9px] text-ink-subtle mt-0.5">
                        {set.content.topic1.subTopic} &middot; {set.content.topic2.subTopic}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {remote.phase === 'loading' && (
              <motion.div
                className="rounded-xl surface-recessed border-dashed border-white/8 p-4 flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-5 h-5 flex-shrink-0 border-2 border-violet-electric/30 border-t-violet-electric rounded-full animate-spin" />
                <div>
                  <p className="text-xs font-bold text-white">Loading the other exams…</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    The server is waking up, which can take up to a minute. This only happens the first
                    time — you can start the practice exam above right now. Thanks for your patience!
                  </p>
                </div>
              </motion.div>
            )}

            {remote.phase === 'offline-only' && (
              <div className="rounded-xl surface-recessed border-dashed border-white/8 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">Offline mode</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    We couldn't reach the exam catalog, so only the offline practice exam above is
                    available right now. Everything still works — your session runs and is scored locally.
                  </p>
                </div>
                <motion.button
                  onClick={() => setRetryCount((n) => n + 1)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg surface-recessed hover:bg-white/[0.04] text-white transition-all font-semibold text-[10px]"
                  whileTap={{ scale: 0.95 }}
                >
                  Try again
                </motion.button>
              </div>
            )}

            <motion.button
              onClick={() => onAutoFallback(mode === 'coached')}
              className="w-full group relative overflow-hidden rounded-xl surface-recessed border-dashed border-white/8 p-4 text-left hover:bg-white/[0.02] transition-all duration-300"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-electric/8 border border-violet-electric/15 flex items-center justify-center">
                  <span className="text-base">🎲</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">Surprise Me</p>
                  <p className="text-[10px] text-ink-subtle">Get a random exam</p>
                </div>
              </div>
            </motion.button>
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
