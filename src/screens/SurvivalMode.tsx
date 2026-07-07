import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Zap, Trophy, ArrowLeft, RefreshCw, Star, Shield, AlertTriangle, Sparkles, Clock, ZapOff, Lightbulb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import minigameQuestions from '../data/scenarios/minigameQuestions.json';
import {
  matchTypedAnswer,
  getStreakMultiplier,
  STANDARD_STREAK_TIERS,
  getSpeedMultiplier,
  useCountdown,
  useGameTimer,
  useStreakMultiplier,
  useFloatingXP,
  gradeFromStats,
  RUBRICS,
  completeMinigameSession,
  shakeAnimation,
  shakeTransition,
  getOverdriveCardClasses,
  GameCountdown,
  GameFeedbackOverlay,
  GameResultsCard,
  FloatingXPOverlay,
  StreakBadge,
} from '../features/minigames';

type GameState = 'idle' | 'countdown' | 'playing' | 'finished';

interface Question {
  difficulty: string;
  english: string;
  french: string | string[];
}

interface EventNotification {
  id: number;
  type: 'level_up' | 'shield_up' | 'perfect' | 'life_up' | 'power_up';
  text: string;
}

function getQuestionMaxTime(currentLevel: number): number {
  return Math.max(5, 20 - Math.floor((currentLevel - 1) / 5) * 2);
}

function getSpeedPreviewMultiplier(timeLeft: number, maxTime: number): number {
  const timeUsed = maxTime - timeLeft;
  return getSpeedMultiplier(timeUsed).multiplier;
}

export function SurvivalMode() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  const [gameState, setGameState] = useState<GameState>('idle');
  const [lives, setLives] = useState(3);
  const [shields, setShields] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const [isShaking, setIsShaking] = useState(false);

  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [runTokens, setRunTokens] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  const {
    streak,
    maxStreak,
    isOverdrive,
    onCorrect: onStreakCorrect,
    onIncorrect: onStreakIncorrect,
    reset: resetStreak,
  } = useStreakMultiplier({ tiers: STANDARD_STREAK_TIERS });

  const { items: floatingXPs, add: addFloatingXP, clear: clearFloatingXP } = useFloatingXP();

  function prepareNextQuestion() {
    setFeedback(null);
    setUserInput('');
    setShowHint(false);
    const nextQ = getNextQuestion(level);
    setQuestions(prev => [...prev, nextQ]);
    setCurrentIndex(prev => prev + 1);

    const newMax = getQuestionMaxTime(level);
    timer.reset(newMax);
    setStartTime(Date.now());
  }

  function handleTimeOut() {
    if (feedback) return;
    setTotalAnswered(prev => prev + 1);
    setIsShaking(true);

    if (shields > 0) {
      setShields(prev => prev - 1);
      setFeedback('correct');
      addNotification('shield_up', 'SHIELD BLOCKED TIMEOUT!');
      setTimeout(() => {
        prepareNextQuestion();
      }, 800);
    } else {
      onStreakIncorrect();
      setFeedback('timeout');
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setTimeout(() => setGameState('finished'), 1500);
        }
        return newLives;
      });

      setTimeout(() => {
        if (lives > 1) {
          prepareNextQuestion();
        }
      }, 1500);
    }
    setTimeout(() => setIsShaking(false), 500);
  }

  const timer = useGameTimer({
    mode: 'perQuestion',
    initialSeconds: 20,
    tickMs: 100,
    paused: isTimerPaused,
    active: gameState === 'playing' && !feedback,
    onExpire: handleTimeOut,
  });

  const countdown = useCountdown({
    onComplete: () => {
      setGameState('playing');
      const initialMax = getQuestionMaxTime(level);
      timer.reset(initialMax);
      setStartTime(Date.now());
      setTimeout(() => inputRef.current?.focus(), 10);
    },
  });

  const isDanger = lives === 1;

  const easyPool = minigameQuestions.filter(q => q.difficulty === 'easy');
  const mediumPool = minigameQuestions.filter(q => q.difficulty === 'medium');
  const hardPool = minigameQuestions.filter(q => q.difficulty === 'hard');

  const addNotification = (type: EventNotification['type'], text: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, text }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  };

  const getNextQuestion = (currentLevel: number) => {
    let pool = easyPool;
    if (currentLevel >= 15) pool = hardPool;
    else if (currentLevel >= 8) pool = mediumPool;

    return pool[Math.floor(Math.random() * pool.length)];
  };

  useEffect(() => {
    const firstQ = getNextQuestion(1);
    setQuestions([firstQ]);
  }, []);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || feedback) return;

    setTotalAnswered(prev => prev + 1);
    const currentQ = questions[currentIndex];
    const isCorrect = matchTypedAnswer(userInput, currentQ.french);

    if (isCorrect) {
      const updatedCorrect = correctAnswers + 1;
      setCorrectAnswers(updatedCorrect);
      const newStreak = streak + 1;
      onStreakCorrect();

      if (newStreak % 3 === 0) {
        setRunTokens(prev => prev + 1);
        addNotification('power_up', '+1 ENERGY');
      }

      const newLevel = Math.floor(updatedCorrect / 5) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        addNotification('level_up', `LEVEL ${newLevel}!`);
      }

      if (newStreak > 0 && newStreak % 10 === 0 && shields < 2) {
        setShields(prev => prev + 1);
        addNotification('shield_up', 'SHIELD ACQUIRED!');
      }

      if (newStreak > 0 && newStreak % 25 === 0 && lives < 5) {
        setLives(prev => prev + 1);
        addNotification('life_up', 'LIFE RESTORED!');
      }

      if (newStreak === 5) {
        addNotification('perfect', 'UNSTOPPABLE!');
      }

      const streakMult = getStreakMultiplier(newStreak, STANDARD_STREAK_TIERS);
      const timeUsed = (Date.now() - startTime) / 1000;
      const { multiplier: speedMult, label: speedLabel } = getSpeedMultiplier(timeUsed);

      const xpGain = Math.round(5 * streakMult * speedMult);
      setScore(s => s + xpGain);
      setFeedback('correct');

      addFloatingXP({
        amount: xpGain,
        x: Math.random() * 40 - 20,
        label: speedLabel || undefined,
      });

      setTimeout(() => {
        prepareNextQuestion();
      }, 600);
    } else {
      onStreakIncorrect();
      setIsShaking(true);

      if (shields > 0) {
        setShields(prev => prev - 1);
        setFeedback('correct');
        addNotification('shield_up', 'SHIELD BLOCKED!');
        setTimeout(() => {
          prepareNextQuestion();
        }, 800);
      } else {
        setFeedback('incorrect');
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setTimeout(() => setGameState('finished'), 1500);
          }
          return newLives;
        });

        setTimeout(() => {
          if (lives > 1) {
            prepareNextQuestion();
          }
        }, 1500);
      }

      setTimeout(() => setIsShaking(false), 500);
    }
  };

  useEffect(() => {
    if (gameState === 'finished') {
      completeMinigameSession({ dispatch, score });
    }
  }, [gameState, dispatch, score]);

  const handleFreeze = () => {
    if (runTokens < 1 || isTimerPaused || feedback) return;
    setRunTokens(prev => prev - 1);
    setIsTimerPaused(true);
    addNotification('power_up', 'TIME FROZEN!');
    setTimeout(() => setIsTimerPaused(false), 5000);
  };

  const handleSkip = () => {
    if (runTokens < 1 || feedback) return;
    setRunTokens(prev => prev - 1);
    addNotification('power_up', 'PHRASE SKIPPED!');
    prepareNextQuestion();
  };

  const handleHint = () => {
    if (runTokens < 1 || showHint || feedback) return;
    setRunTokens(prev => prev - 1);
    setShowHint(true);
    addNotification('power_up', 'HINT REVEALED!');
  };

  const startGame = () => {
    setGameState('countdown');
    countdown.start();
  };

  const resetGame = () => {
    const firstQ = getNextQuestion(1);
    setQuestions([firstQ]);
    setCurrentIndex(0);
    setScore(0);
    resetStreak();
    setCorrectAnswers(0);
    setTotalAnswered(0);
    setUserInput('');
    setLives(3);
    setShields(0);
    setLevel(1);
    setGameState('countdown');
    setNotifications([]);
    clearFloatingXP();

    timer.reset(20);
    setIsTimerPaused(false);
    setRunTokens(0);
    setShowHint(false);
    countdown.start();
  };

  if (gameState === 'idle') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />

          <div className="w-24 h-24 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto border border-orange-500/20 relative group">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
            <Zap size={48} className="text-orange-400 fill-orange-400/20 relative z-10" />
          </div>

          <div>
            <h1 className="text-4xl font-black text-white mb-2 italic tracking-tighter">SURVIVAL BLITZ</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Translate phrases under intense pressure.
              <br/>
              <span className="text-orange-400 font-bold uppercase text-[10px] tracking-widest mt-2 block">20S TIMER • SPEED MULTIPLIERS • ENERGY POWER-UPS</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 py-2">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors">
              <Clock size={16} className="text-blue-400 mx-auto mb-1" />
              <p className="text-[8px] text-slate-500 font-bold uppercase">Timer</p>
              <p className="text-sm font-black text-white">20s</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
              <Zap size={16} className="text-purple-400 mx-auto mb-1" />
              <p className="text-[8px] text-slate-500 font-bold uppercase">Energy</p>
              <p className="text-sm font-black text-white">Earnable</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/30 transition-colors">
              <Star size={16} className="text-orange-400 mx-auto mb-1" />
              <p className="text-[8px] text-slate-500 font-bold uppercase">Speed</p>
              <p className="text-sm font-black text-white">Up to x3</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all uppercase italic tracking-wider border-b-4 border-orange-800 active:border-b-0 active:translate-y-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              INITIATE BLITZ
            </motion.button>
            <button
              onClick={() => navigate('/explore')}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1.5 py-2"
            >
              <ArrowLeft size={12} />
              Abort Mission
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-8">
        <GameCountdown
          display={countdown.display}
          value={countdown.value}
          className="flex items-center justify-center"
          textClassName="text-9xl font-black text-orange-400 italic tracking-tighter drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-orange-500/50 font-black uppercase tracking-[0.5em] text-sm"
        >
          Prepare for Translation
        </motion.p>
      </div>
    );
  }

  if (gameState === 'playing') {
    const currentQ = questions[currentIndex];
    const timeRatio = timer.timeLeft / timer.maxTime;
    const isTimeCritical = timer.isCritical;
    const streakMult = getStreakMultiplier(streak, STANDARD_STREAK_TIERS);
    const speedMult = getSpeedPreviewMultiplier(timer.timeLeft, timer.maxTime);
    const combinedMultiplier = (streakMult * speedMult).toFixed(1);

    return (
      <div className="max-w-3xl mx-auto px-4 pt-12 relative">
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-xs px-4">
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`py-3 px-6 rounded-2xl border-2 shadow-2xl flex items-center justify-center gap-3 backdrop-blur-md ${
                  n.type === 'level_up' ? 'bg-amber-500 border-amber-400 text-slate-950' :
                  n.type === 'shield_up' ? 'bg-blue-600 border-blue-400 text-white' :
                  n.type === 'life_up' ? 'bg-red-600 border-red-400 text-white' :
                  n.type === 'power_up' ? 'bg-purple-600 border-purple-400 text-white' :
                  'bg-white border-white text-slate-950'
                }`}
              >
                {n.type === 'level_up' && <Trophy size={18} />}
                {n.type === 'shield_up' && <Shield size={18} />}
                {n.type === 'life_up' && <Heart size={18} className="fill-white" />}
                {n.type === 'perfect' && <Sparkles size={18} />}
                {n.type === 'power_up' && <Zap size={18} />}
                <span className="font-black italic tracking-tight">{n.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`glass-elevated px-5 py-2.5 rounded-2xl flex items-center gap-3 transition-all duration-500 relative border-2 ${isOverdrive ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'border-white/5'}`}>
                <Zap size={18} className={`text-orange-400 ${isOverdrive ? 'animate-pulse' : ''}`} />
                <span className="text-2xl font-black text-white tabular-nums">{score}</span>
                <FloatingXPOverlay items={floatingXPs} className="text-orange-400 text-2xl" animateY={-80} />
              </div>

              <StreakBadge streak={streak} isOverdrive={isOverdrive} overdriveLabel="OVERDRIVE!" />

              <div className="flex gap-1.5">
                {[...Array(shields)].map((_, i) => (
                  <motion.div
                    key={`shield-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  >
                    <Shield size={20} className="fill-blue-500/20" />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={`heart-${i}`}
                    initial={false}
                    animate={{
                      scale: i < lives ? 1 : 0.8,
                      opacity: i < lives ? 1 : 0.2,
                      y: (i < lives && isDanger) ? [0, -4, 0] : 0
                    }}
                    transition={isDanger ? { repeat: Infinity, duration: 0.6, delay: i * 0.1 } : {}}
                  >
                    <Heart
                      size={28}
                      className={i < lives ? "text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "text-slate-800"}
                    />
                  </motion.div>
                ))}
              </div>
              {isDanger && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="flex items-center gap-1 text-red-500 font-black text-[10px] uppercase tracking-widest"
                >
                  <AlertTriangle size={10} />
                  Critical Health
                </motion.div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isTimeCritical ? 'text-red-500' : 'text-slate-500'}`}>
                <Clock size={12} className={isTimeCritical ? 'animate-spin' : ''} />
                {isTimerPaused ? 'TIME FROZEN' : `${timer.timeLeft.toFixed(1)}s Remaining`}
              </span>
              <span className="text-[10px] font-black text-slate-500 uppercase">Multiplier x{combinedMultiplier}</span>
            </div>
            <div className={`w-full h-3 bg-white/5 rounded-full overflow-hidden border p-0.5 transition-colors duration-300 ${isTimeCritical ? 'border-red-500/50' : 'border-white/5'}`}>
              <motion.div
                className={`h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] ${
                  isTimerPaused ? 'bg-blue-400' :
                  timeRatio > 0.6 ? 'bg-emerald-500' :
                  timeRatio > 0.3 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: `${timeRatio * 100}%` }}
                transition={{ type: 'tween', ease: 'linear' }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <div className="glass-elevated px-4 py-2 rounded-2xl flex items-center gap-4 border-white/5">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-500 uppercase mb-1">Energy</span>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-2 h-4 rounded-sm ${i < runTokens ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-slate-800'}`} />
                ))}
              </div>
            </div>
            <div className="w-[1px] h-8 bg-white/10 mx-2" />
            <div className="flex gap-3">
              <button
                onClick={handleFreeze}
                disabled={runTokens < 1 || isTimerPaused || feedback !== null}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  runTokens >= 1 && !isTimerPaused ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 hover:scale-110 active:scale-95' : 'border-white/5 bg-white/5 text-slate-600'
                }`}
              >
                <ZapOff size={20} />
                <span className="text-[8px] font-black uppercase">Freeze</span>
              </button>
              <button
                onClick={handleSkip}
                disabled={runTokens < 1 || feedback !== null}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  runTokens >= 1 ? 'border-purple-500/50 bg-purple-500/10 text-purple-400 hover:scale-110 active:scale-95' : 'border-white/5 bg-white/5 text-slate-600'
                }`}
              >
                <RefreshCw size={20} />
                <span className="text-[8px] font-black uppercase">Skip</span>
              </button>
              <button
                onClick={handleHint}
                disabled={runTokens < 1 || showHint || feedback !== null}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  runTokens >= 1 && !showHint ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 hover:scale-110 active:scale-95' : 'border-white/5 bg-white/5 text-slate-600'
                }`}
              >
                <Lightbulb size={20} />
                <span className="text-[8px] font-black uppercase">Hint</span>
              </button>
            </div>
          </div>
        </div>

        <motion.div
          className={`glass-elevated p-10 rounded-[2.5rem] relative overflow-hidden transition-all duration-700 border-2 ${
            isOverdrive ? `border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.15)] bg-orange-500/[0.02] ${getOverdriveCardClasses(isOverdrive)}` :
            isDanger ? 'border-red-500/30 bg-red-500/[0.02]' :
            isTimeCritical ? 'border-red-500/40 bg-red-500/[0.01]' : 'border-white/10'
          }`}
          animate={
            isShaking ? shakeAnimation :
            (isTimeCritical && !feedback) ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }
          }
          transition={
            isTimeCritical && !isShaking ? { repeat: Infinity, duration: 0.1 } : shakeTransition
          }
          layout
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            {isTimerPaused ? <ZapOff size={120} className="text-blue-400 rotate-12" /> : <Shield size={120} className="text-white rotate-12" />}
          </div>

          <GameFeedbackOverlay
            feedback={feedback}
            correctAnswer={Array.isArray(currentQ?.french) ? currentQ.french[0] : currentQ?.french}
            correctLabel="Correct Translation:"
            timeoutLabel="TIME EXPIRED"
            className={
              feedback === 'correct' ? 'bg-emerald-500/10 backdrop-blur-sm z-20' :
              feedback === 'timeout' ? 'bg-amber-500/20 backdrop-blur-sm z-20' :
              'bg-red-500/20 backdrop-blur-sm z-20'
            }
          />

          <div className="text-center space-y-10 relative z-10">
            <div className="min-h-[120px] flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-4"
              >
                <div className="h-[1px] w-8 bg-slate-800" />
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">English Phrase</span>
                <div className="h-[1px] w-8 bg-slate-800" />
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.h2
                  key={currentQ?.english}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.05, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl md:text-5xl font-black text-white leading-tight italic tracking-tight"
                >
                  {currentQ?.english}
                </motion.h2>
              </AnimatePresence>
            </div>

            <form onSubmit={handleCheck} className="relative max-w-xl mx-auto">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={showHint ? `Starts with: ${Array.isArray(currentQ.french) ? currentQ.french[0].substring(0, 3) : currentQ.french.substring(0, 3)}...` : "Type French translation..."}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className={`w-full bg-slate-900/80 border-2 rounded-[2rem] px-8 py-6 text-2xl font-black text-white placeholder:text-slate-700 focus:outline-none transition-all text-center ${
                  isOverdrive ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)] focus:border-orange-400' :
                  isDanger ? 'border-red-500/40 focus:border-red-500' :
                  isTimeCritical ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-orange-500/50'
                }`}
              />
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest opacity-40 animate-pulse">
                  Press Enter to Submit
                </p>
              </div>
            </form>
          </div>
        </motion.div>

        {(isDanger || isTimeCritical) && !feedback && (
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className={`absolute inset-0 border-[16px] animate-pulse ${isDanger ? 'border-red-500/10' : 'border-orange-500/5'}`} />
            <div className={`absolute inset-0 animate-pulse ${isDanger ? 'bg-red-500/[0.02]' : 'bg-orange-500/[0.01]'}`} />
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'finished') {
    const graded = gradeFromStats(
      { score, correctAnswers, totalAnswered, maxStreak, accuracy: 0, level },
      RUBRICS.survival,
      'survival'
    );

    return (
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600 z-10 pointer-events-none" />
        <GameResultsCard
          grade={graded.grade}
          gradeColor={graded.gradeColor}
          title="Mission Terminated"
          subtitle={graded.message}
          stats={[
            { label: 'Experience', value: `+${score}`, valueClassName: 'text-4xl' },
            { label: 'Max Level', value: level, valueClassName: 'text-4xl text-orange-400' },
            { label: 'Accuracy', value: `${graded.accuracy}%`, valueClassName: 'text-3xl text-blue-400' },
            { label: 'Streak', value: maxStreak, valueClassName: 'text-3xl text-amber-400' },
          ]}
          actions={
            <>
              <motion.button
                onClick={resetGame}
                className="w-full py-5 bg-white text-slate-950 font-black rounded-[1.5rem] hover:bg-slate-100 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-white/5"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw size={20} />
                REDEPLOY SURVIVOR
              </motion.button>
              <button
                onClick={() => navigate('/explore')}
                className="w-full py-4 bg-white/5 border border-white/10 text-white font-black rounded-[1.5rem] hover:bg-white/10 transition-all uppercase text-xs tracking-[0.2em]"
              >
                Exit to Base
              </button>
            </>
          }
        />
      </div>
    );
  }

  return null;
}
