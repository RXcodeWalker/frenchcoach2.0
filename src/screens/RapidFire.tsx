import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Timer, Zap, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Heart, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import minigameQuestions from '../data/scenarios/minigameQuestions.json';
import { EMOJI_QUESTIONS } from '../data/emojiQuestions';
import { QUESTIONS } from '../data/questions';
import {
  matchTypedAnswer,
  getStreakMultiplier,
  DEFAULT_STREAK_TIERS,
  useCountdown,
  useGameTimer,
  useStreakMultiplier,
  useFloatingXP,
  gradeFromStats,
  RUBRICS,
  completeMinigameSession,
  shakeAnimation,
  shakeTransition,
  getOverdriveClasses,
  getOverdriveCardClasses,
  GameCountdown,
  GameFeedbackOverlay,
  GameResultsCard,
  FloatingXPOverlay,
  StreakBadge,
  GameTimerBar,
} from '../features/minigames';

type GameState = 'idle' | 'countdown' | 'playing' | 'finished';

interface Question {
  difficulty: string;
  english: string;
  french: string | string[];
  topic?: string;
}

interface AnswerHistory {
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
}

export function RapidFire() {
  const navigate = useNavigate();
  const { dispatch } = useApp();

  const [gameState, setGameState] = useState<GameState>('idle');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [hearts, setHearts] = useState(3);
  const [history, setHistory] = useState<AnswerHistory[]>([]);
  const [showReview, setShowReview] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    streak,
    maxStreak,
    isOverdrive,
    onCorrect: onStreakCorrect,
    onIncorrect: onStreakIncorrect,
    reset: resetStreak,
  } = useStreakMultiplier({ tiers: DEFAULT_STREAK_TIERS });

  const { items: floatingXPs, add: addFloatingXP } = useFloatingXP();

  const timer = useGameTimer({
    mode: 'global',
    initialSeconds: 60,
    active: gameState === 'playing',
    onExpire: () => setGameState('finished'),
  });

  const countdown = useCountdown({
    onComplete: () => {
      setGameState('playing');
      timer.reset(60);
      setHearts(3);
      setHistory([]);
      setShowReview(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    },
  });
  
  // Topic Pools building
  const [pools, setPools] = useState<Record<string, Question[]>>({
    all: [],
    basics: [],
    objects: [],
    school: [],
    food: [],
  });

  useEffect(() => {
    // 1. Basics from minigameQuestions
    const basics = minigameQuestions;

    // 2. Objects from Emoji Questions
    const objects = EMOJI_QUESTIONS.map(q => ({
      difficulty: 'easy',
      english: q.english.replace(/^the\s/i, ''),
      french: q.french.replace(/^(le|la|l'|les)\s/i, ''),
      topic: 'objects'
    }));

    // 3. Extract from massive QUESTIONS list
    const schoolVocab: Question[] = [];
    const foodVocab: Question[] = [];
    
    QUESTIONS.forEach(q => {
      if (q.keyVocab) {
        q.keyVocab.forEach(v => {
          const item = {
            difficulty: q.difficulty === 1 ? 'easy' : q.difficulty === 2 ? 'medium' : 'hard',
            english: v.en,
            french: v.fr,
            topic: q.topicKey
          };
          if (q.topicKey === 'school') schoolVocab.push(item);
          if (q.topicKey === 'food') foodVocab.push(item);
        });
      }
    });

    setPools({
      all: [...basics, ...objects, ...schoolVocab, ...foodVocab],
      basics,
      objects,
      school: schoolVocab,
      food: foodVocab,
    });
  }, []);

  const getNextQuestion = (currentStreak: number, topic: string = selectedTopic) => {
    const pool = pools[topic] || pools.all;
    if (pool.length === 0) return minigameQuestions[0]; // Fallback
    
    // Simple dynamic difficulty based on streak
    const difficultyLevel = currentStreak >= 10 ? 'hard' : (currentStreak >= 5 ? 'medium' : 'easy');
    let difficultyPool = pool.filter(q => q.difficulty === difficultyLevel);
    
    // If specific difficulty pool is empty, try adjacent
    if (difficultyPool.length === 0) {
      difficultyPool = pool;
    }
    
    return difficultyPool[Math.floor(Math.random() * difficultyPool.length)];
  };

  // Initialize questions
  useEffect(() => {
    if (pools.all.length > 0) {
      const firstQ = getNextQuestion(0);
      setQuestions([firstQ]);
    }
  }, [pools]);

  useEffect(() => {
    if (hearts <= 0 && gameState === 'playing') {
      setGameState('finished');
    }
  }, [hearts, gameState]);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || feedback) return;

    setTotalAnswered(prev => prev + 1);
    const currentQ = questions[currentIndex];
    const isCorrect = matchTypedAnswer(userInput, currentQ.french);

    setHistory(prev => [...prev, {
      question: currentQ,
      userAnswer: userInput,
      isCorrect
    }]);

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      const newStreak = streak + 1;
      onStreakCorrect();
      const multiplier = getStreakMultiplier(newStreak, DEFAULT_STREAK_TIERS);
      const xpGain = Math.round(5 * multiplier);
      setScore(s => s + xpGain);
      setFeedback('correct');

      addFloatingXP({ amount: xpGain, x: Math.random() * 40 - 20 });

      if (newStreak % 5 === 0) timer.addTime(2);
      if (newStreak % 10 === 0) setHearts(prev => Math.min(3, prev + 1));

      setTimeout(() => {
        setFeedback(null);
        setUserInput('');
        const nextQ = getNextQuestion(newStreak, selectedTopic);
        setQuestions(prev => [...prev, nextQ]);
        setCurrentIndex(prev => prev + 1);
      }, 600);
    } else {
      onStreakIncorrect();
      setFeedback('incorrect');
      setIsShaking(true);
      setHearts(prev => prev - 1);
      setTimeout(() => setIsShaking(false), 500);

      timer.subtractTime(2);

      setTimeout(() => {
        setFeedback(null);
        setUserInput('');
        const nextQ = getNextQuestion(0, selectedTopic);
        setQuestions(prev => [...prev, nextQ]);
        setCurrentIndex(prev => prev + 1);
      }, 1200);
    }
  };

  useEffect(() => {
    if (gameState === 'finished') {
      completeMinigameSession({ dispatch, score });
    }
  }, [gameState, dispatch, score]);

  const resetGame = () => {
    const firstQ = getNextQuestion(0, selectedTopic);
    setQuestions([firstQ]);
    setCurrentIndex(0);
    setScore(0);
    resetStreak();
    setCorrectAnswers(0);
    setTotalAnswered(0);
    setUserInput('');
    setGameState('countdown');
    countdown.start();
  };

  const startChallenge = () => {
    setGameState('countdown');
    countdown.start();
  };

  if (gameState === 'idle') {
    const topics = [
      { id: 'all', label: 'Mixed', icon: '🎯', color: 'bg-slate-500' },
      { id: 'basics', label: 'Basics', icon: '🌱', color: 'bg-emerald-500' },
      { id: 'objects', label: 'Objects', icon: '📦', color: 'bg-blue-500' },
      { id: 'school', label: 'School', icon: '🎓', color: 'bg-purple-500' },
      { id: 'food', label: 'Food', icon: '🥐', color: 'bg-orange-500' },
    ];

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
            <Zap size={40} className="text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white mb-2 italic tracking-tighter">RAPID FIRE 2.0</h1>
            <p className="text-slate-400 text-sm">Translate as fast as you can. Don't lose all your <span className="text-red-400 font-bold uppercase">hearts</span>!</p>
          </div>
          
          <div className="space-y-3 text-left">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Select Topic</p>
            <div className="grid grid-cols-2 gap-2">
              {topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${selectedTopic === topic.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                >
                  <span className="text-xl">{topic.icon}</span>
                  <span className={`text-sm font-bold ${selectedTopic === topic.id ? 'text-white' : 'text-slate-400'}`}>{topic.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <Heart size={18} className="text-red-400 mx-auto mb-1 fill-red-400/20" />
              <p className="text-[10px] text-slate-500 font-bold uppercase">Lives</p>
              <p className="text-lg font-black text-white">3 Hearts</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <Zap size={18} className="text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 font-bold uppercase">XP Multiplier</p>
              <p className="text-lg font-black text-white">Up to 5x</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={startChallenge}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all uppercase italic tracking-wider"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              START CHALLENGE
            </motion.button>
            <button 
              onClick={() => navigate('/explore')}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={12} />
              Back to Explore
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <GameCountdown display={countdown.display} value={countdown.value} />
    );
  }

  if (gameState === 'playing') {
    const currentQ = questions[currentIndex];

    return (
      <div className="max-w-2xl mx-auto px-4 pt-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`glass-elevated px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-500 relative ${getOverdriveClasses(isOverdrive)}`}>
              <Zap size={16} className={`text-amber-400 ${isOverdrive ? 'animate-pulse' : ''}`} />
              <span className="text-xl font-black text-white tabular-nums">{score}</span>
              <FloatingXPOverlay items={floatingXPs} />
            </div>

            <div className="glass-elevated px-4 py-2 rounded-xl flex items-center gap-1.5 border-red-500/20">
              {[...Array(3)].map((_, i) => (
                <Heart 
                  key={i} 
                  size={16} 
                  className={`transition-all duration-300 ${i < hearts ? 'text-red-500 fill-red-500' : 'text-slate-700'}`} 
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StreakBadge streak={streak} isOverdrive={isOverdrive} />
            <div className={`glass-elevated px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${timer.isCritical ? 'border-red-500 animate-pulse text-red-400' : 'border-blue-500/20 text-blue-400'}`}>
              <Timer size={16} />
              <span className="text-xl font-black tabular-nums">{timer.timeLeft}s</span>
            </div>
          </div>
        </div>

        <GameTimerBar
          timeLeft={timer.timeLeft}
          maxTime={timer.maxTime}
          isCritical={timer.isCritical}
          isOverdrive={isOverdrive}
          showLabel={false}
          className="mb-8"
        />

        <motion.div 
          className={`glass-elevated p-8 rounded-2xl relative overflow-hidden transition-all duration-500 ${getOverdriveCardClasses(isOverdrive)}`}
          animate={isShaking ? shakeAnimation : { x: 0 }}
          transition={shakeTransition}
          layout
        >
          <GameFeedbackOverlay
            feedback={feedback}
            correctAnswer={Array.isArray(currentQ?.french) ? currentQ.french[0] : currentQ?.french}
          />

          <div className="text-center space-y-8">
            <div className="min-h-[120px] flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4 block">Translate to French</span>
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={currentQ?.english}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-3xl md:text-5xl font-black text-white leading-tight italic tracking-tight"
                >
                  {currentQ?.english}
                </motion.h2>
              </AnimatePresence>
            </div>

            <form onSubmit={handleCheck} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your translation..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className={`w-full bg-slate-900/50 border-2 rounded-2xl px-8 py-6 text-2xl font-bold text-white placeholder:text-slate-700 focus:outline-none transition-all text-center ${isOverdrive ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-white/10 focus:border-blue-500/50'}`}
              />
              <div className="mt-6 flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-white/5" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] opacity-50">Press Enter</p>
                <div className="h-px w-12 bg-white/5" />
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const graded = gradeFromStats(
      { score, correctAnswers, totalAnswered, maxStreak, accuracy: 0 },
      RUBRICS.rapidFire,
      'rapidFire'
    );

    if (showReview) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white italic">SESSION REVIEW</h2>
            <button 
              onClick={() => setShowReview(false)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10"
            >
              Back to Results
            </button>
          </div>

          <div className="space-y-3">
            {history.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`glass-elevated p-4 rounded-xl border-l-4 ${item.isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{item.question.english}</p>
                    <p className="text-lg font-bold text-white">{Array.isArray(item.question.french) ? item.question.french[0] : item.question.french}</p>
                    {!item.isCorrect && (
                      <p className="text-sm text-red-400 mt-2 font-medium">Your answer: {item.userAnswer}</p>
                    )}
                  </div>
                  {item.isCorrect ? (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-red-500 shrink-0" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <GameResultsCard
        grade={graded.grade}
        gradeColor={graded.gradeColor}
        title="Mission Complete"
        subtitle={
          <>
            You've achieved <span className={`font-bold ${graded.gradeColor}`}>{graded.grade} Rank</span> performance!
          </>
        }
        stats={[
          { label: 'Total XP', value: `+${score}`, valueClassName: 'text-3xl' },
          { label: 'Max Streak', value: maxStreak, valueClassName: 'text-3xl text-orange-400' },
          { label: 'Accuracy', value: `${graded.accuracy}%`, valueClassName: 'text-blue-400' },
          { label: 'Phrases', value: `${correctAnswers}/${totalAnswered}` },
        ]}
        actions={
          <>
            <motion.button
              onClick={() => setShowReview(true)}
              className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye size={16} />
              REVIEW MISTAKES
            </motion.button>
            <motion.button
              onClick={resetGame}
              className="w-full py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={18} />
              PLAY AGAIN
            </motion.button>
            <button 
              onClick={() => navigate('/explore')}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors py-2"
            >
              Back to Explore
            </button>
          </>
        }
      />
    );
  }

  return null;
}
