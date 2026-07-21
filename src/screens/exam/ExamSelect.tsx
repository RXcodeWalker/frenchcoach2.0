import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { listPublishedQuestionSets } from '../../data/exam/bank/loader';
import type { AuthoredQuestionSet } from '../../data/exam/bank/types';

interface Props {
  onSelect: (set: AuthoredQuestionSet) => void;
  onAutoFallback: () => void;
}

export function ExamSelect({ onSelect, onAutoFallback }: Props) {
  const [sets, setSets] = useState<AuthoredQuestionSet[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPublishedQuestionSets()
      .then((result) => {
        if (cancelled) return;
        if (result.length === 0) {
          onAutoFallback();
          return;
        }
        setSets(result);
      })
      .catch(() => {
        if (!cancelled) onAutoFallback();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (sets === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto border-2 border-violet-electric/30 border-t-violet-electric rounded-full animate-spin" />
          <p className="text-sm font-bold text-white">Loading exams…</p>
        </div>
      </div>
    );
  }

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sets.map((set, idx) => (
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
                <h3 className="font-bold text-white text-sm mb-1">{set.content.rolePlay.title}</h3>
                <p className="text-[10px] text-slate-600">
                  {set.content.topic1.subTopic} &middot; {set.content.topic2.subTopic}
                </p>
              </div>
            </motion.button>
          ))}
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
