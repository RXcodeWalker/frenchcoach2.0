import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Puzzle, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Lightbulb, 
  Zap, 
  RefreshCcw,
  Target
} from 'lucide-react';
import { REBUILD_QUESTIONS } from '../../data/rebuildQuestions';
import { SKILL_DEFS } from '../../services/coaching/diagnosticEngine';
import { useApp } from '../../context/AppContext';

interface MicroDrillModalProps {
  skillId: string;
  onClose: () => void;
}

// Mapping between diagnostic skillId and REBUILD_QUESTIONS theme
const SKILL_TO_THEME: Record<string, string[]> = {
  elision: ['Elision'],
  negation: ['Negation'],
  preposition: ['Prepositions', 'Verb Patterns'],
  subjunctive: ['Subjunctive'],
  relative_pron: ['Relative Pronouns'],
  tense_past: ['Reflexive Verbs', 'Imperfect Tense'],
  hypothetical: ['Conditionals'],
  gender: ['Adjective Placement'],
  demonstrative: ['Demonstratives'],
  comparative: ['Comparatives'],
};

export const MicroDrillModal: React.FC<MicroDrillModalProps> = ({ skillId, onClose }) => {
  const { dispatch } = useApp();
  const skillDef = SKILL_DEFS[skillId];
  
  const [questions, setQuestions] = useState(
    REBUILD_QUESTIONS.filter(q => 
      SKILL_TO_THEME[skillId]?.includes(q.theme)
    ).sort(() => Math.random() - 0.5).slice(0, 3)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetFragments, setTargetFragments] = useState<string[]>([]);
  const [poolFragments, setPoolFragments] = useState<{id: string, text: string}[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];

  const initQuestion = useCallback(() => {
    if (!currentQuestion) return;
    const pool = currentQuestion.fragments.map((f, i) => ({
      id: `${f}-${i}-${Math.random()}`,
      text: f
    })).sort(() => Math.random() - 0.5);
    setPoolFragments(pool);
    setTargetFragments([]);
    setFeedback(null);
  }, [currentQuestion]);

  useEffect(() => {
    if (questions.length === 0) {
      // Fallback if no specific questions found: use general ones
      setQuestions(REBUILD_QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 3));
    }
  }, [skillId]);

  useEffect(() => {
    initQuestion();
  }, [currentIndex, initQuestion, questions]);

  const handlePoolClick = (fragment: {id: string, text: string}) => {
    if (feedback === 'correct') return;
    setTargetFragments([...targetFragments, fragment.text]);
    setPoolFragments(poolFragments.filter(f => f.id !== fragment.id));
  };

  const handleTargetClick = (index: number) => {
    if (feedback === 'correct') return;
    const text = targetFragments[index];
    setTargetFragments(targetFragments.filter((_, i) => i !== index));
    setPoolFragments([...poolFragments, { id: `${text}-${Date.now()}`, text }]);
  };

  const checkAnswer = () => {
    const userAnswer = targetFragments.join(' ');
    const cleanUser = userAnswer.replace(/[.,!?]/g, '').toLowerCase();
    const cleanTarget = currentQuestion.french.replace(/[.,!?]/g, '').toLowerCase();

    if (cleanUser === cleanTarget) {
      setFeedback('correct');
      setScore(s => s + 10);
      dispatch({ type: 'ADD_XP', amount: 10 });
    } else {
      setFeedback('incorrect');
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-navy/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-xl glass-elevated rounded-[2.5rem] border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-white/5 p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white italic tracking-tighter uppercase">Recovery Drill</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                Targeting: {skillDef?.name || skillId}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.div 
                key="finished"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/30">
                  <CheckCircle2 size={40} className="text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Drill Complete!</h3>
                <p className="text-slate-400 text-sm mb-8">You've successfully addressed your weak point and earned <span className="text-violet-400 font-bold">{score} XP</span>.</p>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl shadow-xl hover:scale-105 transition-all uppercase italic tracking-wider"
                >
                  Return to Analysis
                </button>
              </motion.div>
            ) : (
              <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Question Info */}
                <div className="text-center mb-8">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Question {currentIndex + 1} of {questions.length}</p>
                  <h3 className="text-xl font-bold text-white leading-tight">
                    {currentQuestion.english}
                  </h3>
                </div>

                {/* Building Area */}
                <div className="bg-navy/40 border border-white/5 rounded-3xl p-6 mb-6 min-h-[120px] flex flex-wrap justify-center gap-2 items-center">
                  {targetFragments.length === 0 && (
                    <p className="text-slate-700 italic text-sm">Assemble the sentence...</p>
                  )}
                  {targetFragments.map((frag, i) => (
                    <motion.button
                      layoutId={`drill-frag-${frag}-${i}`}
                      key={`${frag}-${i}`}
                      onClick={() => handleTargetClick(i)}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm shadow-lg"
                    >
                      {frag}
                    </motion.button>
                  ))}
                </div>

                {/* Pool Area */}
                <div className="flex flex-wrap justify-center gap-2 mb-8 min-h-[60px]">
                  {poolFragments.map((frag) => (
                    <motion.button
                      layoutId={`drill-pool-${frag.text}`}
                      key={frag.id}
                      onClick={() => handlePoolClick(frag)}
                      className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-bold text-sm hover:border-violet-500/50 hover:bg-slate-800 transition-colors"
                    >
                      {frag.text}
                    </motion.button>
                  ))}
                </div>

                {/* Feedback & Actions */}
                <div className="flex flex-col items-center gap-4">
                  {feedback === 'correct' ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="text-xl font-black italic uppercase text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 size={24} /> Perfect !
                      </div>
                      <button 
                        onClick={nextQuestion}
                        className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase italic tracking-wider flex items-center justify-center gap-2"
                      >
                        {currentIndex === questions.length - 1 ? 'Finish' : 'Next Question'}
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ) : feedback === 'incorrect' ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="text-xl font-black italic uppercase text-rose-400 flex items-center gap-2">
                        <XCircle size={24} /> Try again...
                      </div>
                      <div className="flex gap-2 w-full">
                        <button 
                          onClick={initQuestion}
                          className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-400 font-bold rounded-2xl hover:text-white flex items-center justify-center gap-2"
                        >
                          <RefreshCcw size={18} /> Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={checkAnswer}
                      disabled={targetFragments.length === 0}
                      className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase italic tracking-wider flex items-center justify-center gap-2 disabled:opacity-30"
                    >
                      Check Answer
                    </button>
                  )}
                  
                  {feedback && currentQuestion.explanation && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 flex gap-3">
                      <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-400 leading-relaxed">{currentQuestion.explanation}</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
