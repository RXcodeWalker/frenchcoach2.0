import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCcw, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  ChevronRight,
  Puzzle,
  Lightbulb,
  Eye,
  Magnet,
  Volume2,
  Timer,
  Flame
} from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { PageShell } from '../components/layout/PageShell';
import { SessionCompletion } from '../components/SessionCompletion';
import { fadeUp } from '../components/motion/variants';
import { REBUILD_QUESTIONS } from '../data/rebuildQuestions';
import { matchTypedAnswer, ModePickerGrid } from '../features/minigames';

type GameMode = 'classic' | 'blind' | 'speed';

export function SentenceRebuilder() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  
  const [mode, setMode] = useState<GameMode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetFragments, setTargetFragments] = useState<string[]>([]);
  const [poolFragments, setPoolFragments] = useState<{id: string, text: string}[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showPeek, setShowPeek] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questions = REBUILD_QUESTIONS;
  const currentQuestion = questions[currentIndex];

  const initQuestion = useCallback(() => {
    if (!currentQuestion) return;
    
    // Create a pool of fragments with unique IDs to handle duplicate words
    const pool = currentQuestion.fragments.map((f, i) => ({
      id: `${f}-${i}-${Math.random()}`,
      text: f
    })).sort(() => Math.random() - 0.5);
    
    setPoolFragments(pool);
    setTargetFragments([]);
    setFeedback(null);
    setShowExplanation(false);
    setShowPeek(false);
    setHintsUsed(0);
  }, [currentQuestion]);

  useEffect(() => {
    if (mode) {
      initQuestion();
      if (mode === 'speed') {
        setTimeLeft(90);
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setIsFinished(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, initQuestion]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  };

  const checkAnswer = () => {
    const userAnswer = targetFragments.join(' ');
    const isCorrect = matchTypedAnswer(userAnswer, currentQuestion.french);

    if (isCorrect) {
      setFeedback('correct');
      const points = Math.max(5, 20 - (hintsUsed * 5));
      const multiplier = mode === 'blind' ? 1.5 : 1;
      const finalPoints = Math.floor(points * multiplier);
      
      setScore(s => s + finalPoints);
      setStreak(s => {
        const newStreak = s + 1;
        if (newStreak > maxStreak) setMaxStreak(newStreak);
        return newStreak;
      });
      setCorrectAnswers(c => c + 1);
      dispatchAddXP(dispatch, finalPoints, 'sentence_rebuilder');
      speak(currentQuestion.french);
    } else {
      setFeedback('incorrect');
      setStreak(0);
    }
  };

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

  const useMagneticHint = () => {
    const targetOrder = currentQuestion.fragments;
    const nextCorrectWord = targetOrder[targetFragments.length];
    
    if (nextCorrectWord) {
      // Find it in pool
      const inPool = poolFragments.find(f => f.text === nextCorrectWord);
      if (inPool) {
        handlePoolClick(inPool);
        setHintsUsed(h => h + 1);
      }
    }
  };

  const usePeek = () => {
    setShowPeek(true);
    setHintsUsed(h => h + 1);
    setTimeout(() => setShowPeek(false), 2000);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const reset = () => {
    setMode(null);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectAnswers(0);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <SessionCompletion
        score={(correctAnswers / questions.length) * 10}
        xpEarned={score}
        wordCount={questions.reduce((acc, q) => acc + q.fragments.length, 0)}
        skillImprovement={{ name: 'Grammar', before: 65, after: 75 }}
        onNext={() => navigate('/explore')}
        onRetry={reset}
        onBack={() => navigate('/')}
        message="Master of structure! Your French syntax is improving. 🧩"
      />
    );
  }

  if (!mode) {
    return (
      <PageShell>
        <ModePickerGrid
          title="Sentence Rebuilder"
          subtitle="Master French syntax through construction"
          titleClassName="italic"
          cardTitleClassName="italic tracking-tighter"
          columns={3}
          modes={[
            {
              id: 'classic',
              icon: <Puzzle className="text-violet-400" />,
              title: 'Classic',
              description: 'English to French translation using word fragments.',
              color: 'violet',
            },
            {
              id: 'blind',
              icon: <Eye className="text-blue-400" />,
              title: 'Blind Build',
              description: 'No English prompt! Build the sentence strictly from logic.',
              color: 'blue',
            },
            {
              id: 'speed',
              icon: <Timer className="text-red-400" />,
              title: 'Speed Run',
              description: '90 seconds. How many sentences can you reconstruct?',
              color: 'red',
            },
          ]}
          onSelect={(id) => setMode(id as GameMode)}
          onBack={() => navigate('/explore')}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMode(null)}
              className="w-10 h-10 rounded-xl surface flex items-center justify-center text-ink-muted hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 mb-0.5">
                <Puzzle size={12} className="text-violet-400" />
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">{mode} Mode</span>
              </div>
              <h1 className="text-lg font-black text-white italic uppercase tracking-tighter">Rebuilder</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mode === 'speed' && (
              <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${timeLeft < 20 ? 'border-red-500 bg-red-500/10 text-red-400' : 'bg-white/5 border-white/10 text-ink-muted'}`}>
                <Timer size={14} />
                <span className="text-xs font-bold font-mono">{timeLeft}s</span>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-400 flex items-center gap-1.5">
              <Flame size={14} className={streak > 0 ? "fill-orange-400" : ""} /> {streak}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-400 flex items-center gap-1.5">
              <Zap size={14} /> {score} XP
            </div>
          </div>
        </div>

        {/* Prompt */}
        <motion.div key={currentIndex} variants={fadeUp} className="text-center mb-10 min-h-[80px]">
          {mode === 'blind' ? (
            <div className="flex flex-col items-center gap-2">
              <Eye size={32} className="text-ink-subtle" />
              <p className="text-ink-muted font-bold">Blind Mode: Build a valid sentence</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-[0.3em] mb-2">Translate to French</p>
              <h2 className="text-3xl font-black text-white italic tracking-tighter leading-tight">
                {currentQuestion.english}
              </h2>
            </>
          )}
        </motion.div>

        {/* Building Area */}
        <div className="surface-raised p-8 rounded-[2.5rem] border-white/5 bg-slate-950/40 relative mb-8 min-h-[160px]">
          <AnimatePresence mode="wait">
            {showPeek ? (
              <motion.div 
                key="peek"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-2xl font-black text-violet-400 italic text-center"
              >
                {currentQuestion.french}
              </motion.div>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {targetFragments.length === 0 && (
                  <p className="text-ink-subtle font-medium italic mt-4">Tap or drag words here...</p>
                )}
                {targetFragments.map((frag, i) => (
                  <motion.button
                    layoutId={`frag-${frag}-${i}`}
                    key={`${frag}-${i}`}
                    onClick={() => handleTargetClick(i)}
                    className="px-5 py-3 rounded-2xl bg-violet-600 text-white font-bold text-lg shadow-lg border-b-4 border-violet-800"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {frag}
                  </motion.button>
                ))}
              </div>
            )}
          </AnimatePresence>

          <div className="absolute -top-4 right-6 flex gap-2">
            <HintButton onClick={usePeek} icon={<Eye size={18} />} label="Peek" active={showPeek} />
            <HintButton onClick={useMagneticHint} icon={<Magnet size={18} />} label="Snap" />
            <HintButton onClick={() => setShowExplanation(!showExplanation)} icon={<Lightbulb size={18} />} label="Why?" active={showExplanation} color="text-amber-400" />
            <HintButton onClick={() => speak(currentQuestion.french)} icon={<Volume2 size={18} />} label="Listen" />
          </div>
        </div>

        {/* Pool Area */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 min-h-[100px]">
          {poolFragments.map((frag) => (
            <motion.button
              layoutId={`frag-${frag.text}`}
              key={frag.id}
              onClick={() => handlePoolClick(frag)}
              className="px-5 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white font-bold text-lg hover:border-violet-500/50 hover:bg-slate-800 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {frag.text}
            </motion.button>
          ))}
        </div>

        {/* Feedback & Controls */}
        <div className="flex flex-col items-center gap-6">
          <AnimatePresence mode="wait">
            {!feedback ? (
              <motion.button
                key="check"
                onClick={checkAnswer}
                disabled={targetFragments.length === 0}
                className="px-12 py-5 bg-white text-slate-950 font-black rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all uppercase italic tracking-wider flex items-center gap-3 disabled:opacity-30"
              >
                <CheckCircle2 size={20} />
                Check Sentence
              </motion.button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6 w-full">
                <div className={`text-3xl font-black italic uppercase flex items-center gap-4 ${feedback === 'correct' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {feedback === 'correct' ? <><CheckCircle2 size={32} /> Excellent !</> : <><XCircle size={32} /> Pas encore...</>}
                </div>

                <div className="flex gap-4">
                  {feedback === 'incorrect' && (
                    <button onClick={initQuestion} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-ink-muted font-bold hover:text-white">
                      <RefreshCcw size={18} />
                    </button>
                  )}
                  <button
                    onClick={nextQuestion}
                    className={`px-12 py-5 rounded-full font-black uppercase italic tracking-wider flex items-center gap-3 ${
                      feedback === 'correct' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-800 text-white border border-white/10'
                    }`}
                  >
                    {currentIndex === questions.length - 1 ? 'Finish Session' : 'Continue'}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showExplanation && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-full">
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-4">
                  <Lightbulb size={24} className="text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest mb-1">Grammar Note</p>
                    <p className="text-sm text-amber-200/80 leading-relaxed">{currentQuestion.explanation}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
}

function HintButton({ onClick, icon, label, active, color = "text-ink-muted" }: {
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  active?: boolean;
  color?: string;
}) {
  return (
    <button onClick={onClick} className={`group relative flex flex-col items-center gap-1 transition-all ${active ? 'scale-110' : 'hover:scale-105'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
        active 
          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/40 border-violet-400' 
          : `bg-slate-900 border border-white/10 ${color} hover:border-white/20 hover:text-white shadow-xl`
      }`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-widest transition-opacity ${active ? 'opacity-100 text-violet-400' : 'opacity-0 group-hover:opacity-100 text-ink-muted'}`}>
        {label}
      </span>
    </button>
  );
}

