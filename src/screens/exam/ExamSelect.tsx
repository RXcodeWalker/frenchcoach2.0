import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { listPublishedQuestionSetsWithRetry, getOfflineAuthoredSets } from '../../data/exam/bank/loader';
import type { AuthoredQuestionSet, Difficulty } from '../../data/exam/bank/types';

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
  onSelect: (set: AuthoredQuestionSet) => void;
  onAutoFallback: () => void;
}

// The remote catalog rides out a Render free-tier cold start (up to ~45s) in the
// background. Rather than block the whole screen on a spinner for that long, we
// render the bundled offline exam immediately and swap in the full catalog once
// it arrives — or keep the offline set if the backend is genuinely unreachable.
type RemoteState =
  | { phase: 'loading' }
  | { phase: 'ready'; sets: AuthoredQuestionSet[] }
  | { phase: 'offline-only' };

export function ExamSelect({ onSelect, onAutoFallback }: Props) {
  // Available synchronously — no network — so a card is on screen from the first paint.
  const offlineSets = useMemo(() => getOfflineAuthoredSets(), []);
  const [remote, setRemote] = useState<RemoteState>({ phase: 'loading' });
  // Bumped on manual retry to re-run the fetch effect below without remounting the screen.
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
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
  }, [retryCount]);

  const sets = remote.phase === 'ready' ? remote.sets : offlineSets;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Choose an Exam</h1>
          <p className="text-sm text-ink-muted mt-1">Pick one of the Cambridge-style mock exams below</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sets.map((set, idx) => {
            const difficulty = dominantDifficulty(set);
            return (
              <motion.button
                key={set.questionSetId}
                onClick={() => onSelect(set)}
                className="group relative overflow-hidden rounded-xl glass p-5 text-left hover:border-white/10 transition-all duration-300"
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
            className="rounded-xl glass-subtle border-dashed border-white/8 p-4 flex items-center gap-3"
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
          <div className="rounded-xl glass-subtle border-dashed border-white/8 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">Offline mode</p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                We couldn't reach the exam catalog, so only the offline practice exam above is
                available right now. Everything still works — your session runs and is scored locally.
              </p>
            </div>
            <motion.button
              onClick={() => setRetryCount((n) => n + 1)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg glass-subtle hover:bg-white/[0.04] text-white transition-all font-semibold text-[10px]"
              whileTap={{ scale: 0.95 }}
            >
              Try again
            </motion.button>
          </div>
        )}

        <motion.button
          onClick={onAutoFallback}
          className="w-full group relative overflow-hidden rounded-xl glass-subtle border-dashed border-white/8 p-4 text-left hover:bg-white/[0.02] transition-all duration-300"
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
      </motion.div>
    </div>
  );
}
