import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { listPublishedQuestionSetsWithRetry } from '../../data/exam/bank/loader';
import { useElapsedClock } from '../../features/recording/useElapsedClock';
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

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; sets: AuthoredQuestionSet[]; source: 'remote' | 'fixture' };

export function ExamSelect({ onSelect, onAutoFallback }: Props) {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const { elapsedS, start, stop } = useElapsedClock();

  useEffect(() => {
    let cancelled = false;
    start();
    listPublishedQuestionSetsWithRetry()
      .then(({ sets, source }) => {
        if (cancelled) return;
        stop();
        if (sets.length === 0) {
          onAutoFallback();
          return;
        }
        setState({ phase: 'ready', sets, source });
      })
      .catch(() => {
        if (!cancelled) {
          stop();
          onAutoFallback();
        }
      });
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.phase === 'loading') {
    const message =
      elapsedS >= 8
        ? 'Waking up the server… this can take up to a minute on a cold start.'
        : elapsedS >= 3
          ? 'Still loading… this is taking a little longer than usual.'
          : 'Loading exams…';
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto border-2 border-violet-electric/30 border-t-violet-electric rounded-full animate-spin" />
          <p className="text-sm font-bold text-white">{message}</p>
        </div>
      </div>
    );
  }

  const { sets, source } = state;

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
          <p className="text-sm text-slate-500 mt-1">Pick one of the Cambridge-style mock exams below</p>
        </div>

        {source === 'fixture' && (
          <div className="rounded-xl glass-subtle border-dashed border-white/8 p-4">
            <p className="text-xs font-bold text-white">Offline mode</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              We couldn't reach the exam catalog, so only one offline practice exam is available below.
            </p>
          </div>
        )}

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
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-navy-400 text-slate-500">
                        {DIFFICULTY_LABEL[difficulty]}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600">
                    {TOPIC_AREA_LABEL[set.content.topic1.topicArea] ?? set.content.topic1.topicArea} &middot;{' '}
                    {TOPIC_AREA_LABEL[set.content.topic2.topicArea] ?? set.content.topic2.topicArea}
                  </p>
                  <p className="text-[9px] text-slate-700 mt-0.5">
                    {set.content.topic1.subTopic} &middot; {set.content.topic2.subTopic}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

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
              <p className="text-[10px] text-slate-600">Get a random exam</p>
            </div>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}
