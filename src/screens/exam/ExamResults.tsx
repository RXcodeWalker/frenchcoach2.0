import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { scoreColor } from '../../domain/scoring';
import type { ExamQuestion } from '../../types/index';

interface Props {
  answers: { score: number; time: number; phase: string }[];
  questions: ExamQuestion[];
  onRetake: () => void;
  onHome: () => void;
}

export function ExamResults({ answers, questions, onRetake, onHome }: Props) {
  // Group answers by phase
  const rpAnswers = answers.filter(a => a.phase === 'roleplay');
  const t1Answers = answers.filter(a => a.phase === 'topic1');
  const t2Answers = answers.filter(a => a.phase === 'topic2');

  const rpScore = rpAnswers.length > 0 
    ? (rpAnswers.reduce((s, a) => s + a.score, 0) / rpAnswers.length) 
    : 0;
  
  const t1Score = t1Answers.length > 0 
    ? (t1Answers.reduce((s, a) => s + a.score, 0) / t1Answers.length) * 1.5
    : 0;

  const t2Score = t2Answers.length > 0 
    ? (t2Answers.reduce((s, a) => s + a.score, 0) / t2Answers.length) * 1.5
    : 0;

  const totalScore = Math.round((rpScore + t1Score + t2Score) * 10) / 10;
  
  // Official Cambridge Grade Thresholds (Approximate)
  // A* (35+), A (31+), B (27+), C (23+), D (19+), E (15+)
  const getGrade = (s: number) => {
    if (s >= 35) return { grade: 'A*', color: '#10B981' };
    if (s >= 31) return { grade: 'A', color: '#10B981' };
    if (s >= 27) return { grade: 'B', color: '#F59E0B' };
    if (s >= 23) return { grade: 'C', color: '#F59E0B' };
    if (s >= 19) return { grade: 'D', color: '#EF4444' };
    if (s >= 15) return { grade: 'E', color: '#EF4444' };
    return { grade: 'U', color: '#94A3B8' };
  };

  const { grade, color: gradeColor } = getGrade(totalScore);

  const sections = [
    { label: 'Role Play', score: rpScore, max: 10, count: rpAnswers.length },
    { label: 'Topic Conversation 1', score: t1Score, max: 15, count: t1Answers.length },
    { label: 'Topic Conversation 2', score: t2Score, max: 15, count: t2Answers.length },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-2xl glass-elevated border-amber-500/15 p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/3 to-transparent pointer-events-none" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <Trophy size={36} className="mx-auto text-amber-400 mb-3" style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.4))' }} />
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-1">IGCSE Result</h2>
            <p className="font-bold text-sm mb-4 text-slate-400">Component 3: Speaking</p>
            
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <motion.div
                  className="text-6xl font-black"
                  style={{ color: gradeColor }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                >
                  {grade}
                </motion.div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Grade</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-4xl font-black text-white">
                  {totalScore.toFixed(0)}
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total / 40</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {sections.map((sec, i) => (
            <motion.div
              key={sec.label}
              className="p-4 rounded-xl glass-elevated border-white/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{sec.label}</h4>
                  <p className="text-[9px] text-slate-500">{sec.count} responses evaluated</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-violet-400">{sec.score.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-600 ml-1">/ {sec.max}</span>
                </div>
              </div>
              <div className="h-1.5 bg-navy-300 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(sec.score / sec.max) * 100}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2">
          <motion.button onClick={onRetake} className="flex-1 py-3 rounded-xl glass-subtle text-white font-bold text-xs" whileTap={{ scale: 0.97 }}>New Mock Exam</motion.button>
          <motion.button onClick={onHome} className="flex-1 btn-primary py-3 rounded-xl font-bold text-xs" whileTap={{ scale: 0.97 }}>Dashboard</motion.button>
        </div>
      </motion.div>
    </div>
  );
}

