import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Zap, Trophy, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Flame, Star, Shield, AlertTriangle, Sparkles, Clock, ZapOff, Lightbulb } from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import minigameQuestions from '../data/scenarios/minigameQuestions.json';

type GameState = 'idle' | 'countdown' | 'playing' | 'finished';

interface Question {
  difficulty: string;
  english: string;
  french: string | string[];
}

interface FloatingXP {
  id: number;
  amount: number;
  x: number;
  y: number;
  label?: string;
}

interface EventNotification {
  id: number;
  type: 'level_up' | 'shield_up' | 'perfect' | 'life_up' | 'power_up';
  text: string;
}

export function SurvivalMode() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [gameState, setGameState] = useState<GameState>('idle');
  const [countdown, setCountdown] = useState(3);
  const [lives, setLives] = useState(3);
  const [shields, setShields] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);
  
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const [isShaking, setIsShaking] = useState(false);

  // Survival 2.0 States
  const [timeLeft, setTimeLeft] = useState(20);
  const [maxTime, setMaxTime] = useState(20);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [runTokens, setRunTokens] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  
  const isOverdrive = streak >= 10;
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

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState('playing');
        const initialMax = Math.max(5, 20 - Math.floor((level - 1) / 5) * 2);
        setMaxTime(initialMax);
        setTimeLeft(initialMax);
        setStartTime(Date.now());
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    }
  }, [gameState, countdown, level]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && !isTimerPaused && !feedback) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            handleTimeOut();
            return 0;
          }
          return Math.round((prev - 0.1) * 10) / 10;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [gameState, isTimerPaused, feedback]);

  const handleTimeOut = () => {
    if (feedback) return;
    setTotalAnswered(prev => prev + 1);
    setIsShaking(true);
    
    if (shields > 0) {
      setShields(prev => prev - 1);
      setFeedback('correct'); // Using green feedback for shield block
      addNotification('shield_up', 'SHIELD BLOCKED TIMEOUT!');
      setTimeout(() => {
        prepareNextQuestion();
      }, 800);
    } else {
      setStreak(0);
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
  };

  const prepareNextQuestion = () => {
    setFeedback(null);
    setUserInput('');
    setShowHint(false);
    const nextQ = getNextQuestion(level);
    setQuestions(prev => [...prev, nextQ]);
    setCurrentIndex(prev => prev + 1);
    
    // Reset timer for next question
    const newMax = Math.max(5, 20 - Math.floor((level - 1) / 5) * 2);
    setMaxTime(newMax);
    setTimeLeft(newMax);
    setStartTime(Date.now());
  };

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .replace(/\s{2,}/g, " ");
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || feedback) return;

    setTotalAnswered(prev => prev + 1);
    const currentQ = questions[currentIndex];
    const acceptable = Array.isArray(currentQ.french) 
      ? currentQ.french.map(normalize)
      : [normalize(currentQ.french)];
    
    const isCorrect = acceptable.includes(normalize(userInput));

    if (isCorrect) {
      const updatedCorrect = correctAnswers + 1;
      setCorrectAnswers(updatedCorrect);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      // Energy/Tokens gain
      if (newStreak % 3 === 0) {
        setRunTokens(prev => prev + 1);
        addNotification('power_up', '+1 ENERGY');
      }

      // Level Up Check
      const newLevel = Math.floor(updatedCorrect / 5) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        addNotification('level_up', `LEVEL ${newLevel}!`);
      }

      // Shield Check (Every 10 streak, max 2)
      if (newStreak > 0 && newStreak % 10 === 0 && shields < 2) {
        setShields(prev => prev + 1);
        addNotification('shield_up', 'SHIELD ACQUIRED!');
      }

      // Bonus life (Every 25 streak, max 5)
      if (newStreak > 0 && newStreak % 25 === 0 && lives < 5) {
        setLives(prev => prev + 1);
        addNotification('life_up', 'LIFE RESTORED!');
      }

      // Perfect Bonus
      if (newStreak === 5) {
        addNotification('perfect', 'UNSTOPPABLE!');
      }

      // Multipliers
      let streakMult = 1;
      if (newStreak >= 10) streakMult = 3;
      else if (newStreak >= 5) streakMult = 2;
      else if (newStreak >= 3) streakMult = 1.5;

      // Speed Multiplier
      const timeUsed = (Date.now() - startTime) / 1000;
      let speedMult = 1;
      let speedLabel = "";
      if (timeUsed < 3) { speedMult = 3; speedLabel = "GODLIKE SPEED!"; }
      else if (timeUsed < 5) { speedMult = 2; speedLabel = "LIGHTNING FAST!"; }
      else if (timeUsed < 8) { speedMult = 1.5; speedLabel = "SPEEDY!"; }

      const xpGain = Math.round(5 * streakMult * speedMult);
      setScore(s => s + xpGain);
      setFeedback('correct');

      const id = Date.now();
      setFloatingXPs(prev => [...prev, { 
        id, 
        amount: xpGain, 
        x: Math.random() * 40 - 20, 
        y: 0,
        label: speedLabel
      }]);
      setTimeout(() => setFloatingXPs(prev => prev.filter(f => f.id !== id)), 1000);

      setTimeout(() => {
        prepareNextQuestion();
      }, 600);
    } else {
      setStreak(0);
      setIsShaking(true);
      
      if (shields > 0) {
        setShields(prev => prev - 1);
        setFeedback('correct'); // Using green feedback for shield block
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

  const finishGame = () => {
    if (score > 0) {
      dispatchAddXP(dispatch, score);
    }
  };

  useEffect(() => {
    if (gameState === 'finished') {
      finishGame();
    }
  }, [gameState]);

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

  const resetGame = () => {
    const firstQ = getNextQuestion(1);
    setQuestions([firstQ]);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectAnswers(0);
    setTotalAnswered(0);
    setUserInput('');
    setCountdown(3);
    setLives(3);
    setShields(0);
    setLevel(1);
    setGameState('countdown');
    setNotifications([]);
    
    // Reset 2.0 states
    setTimeLeft(20);
    setMaxTime(20);
    setIsTimerPaused(false);
    setRunTokens(0);
    setShowHint(false);
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
              onClick={() => setGameState('countdown')}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.2, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 2, rotate: 20 }}
            className="text-[12rem] font-black text-orange-400 italic tracking-tighter drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]"
          >
            {countdown === 0 ? 'GO!' : countdown}
          </motion.div>
        </AnimatePresence>
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
    const levelProgress = ((correctAnswers % 5) / 5) * 100;
    const timeRatio = timeLeft / maxTime;
    const isTimeCritical = timeLeft < 5;
    
    return (
      <div className="max-w-3xl mx-auto px-4 pt-12 relative">
        {/* Notifications Overlay */}
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

        {/* HUD */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`glass-elevated px-5 py-2.5 rounded-2xl flex items-center gap-3 transition-all duration-500 relative border-2 ${isOverdrive ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'border-white/5'}`}>
                <Zap size={18} className={`text-orange-400 ${isOverdrive ? 'animate-pulse' : ''}`} />
                <span className="text-2xl font-black text-white tabular-nums">{score}</span>
                
                <AnimatePresence>
                  {floatingXPs.map(fxp => (
                    <motion.div
                      key={fxp.id}
                      initial={{ opacity: 0, y: 0, x: fxp.x }}
                      animate={{ opacity: 1, y: -80 }}
                      exit={{ opacity: 0 }}
                      className="absolute pointer-events-none flex flex-col items-center whitespace-nowrap"
                    >
                      <span className="font-black text-orange-400 text-2xl">+{fxp.amount}</span>
                      {fxp.label && (
                        <span className="text-[10px] font-black text-white bg-orange-600 px-2 py-0.5 rounded-full uppercase italic tracking-tighter">
                          {fxp.label}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

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

          {/* Timer Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isTimeCritical ? 'text-red-500' : 'text-slate-500'}`}>
                <Clock size={12} className={isTimeCritical ? 'animate-spin' : ''} />
                {isTimerPaused ? 'TIME FROZEN' : `${timeLeft.toFixed(1)}s Remaining`}
              </span>
              <span className="text-[10px] font-black text-slate-500 uppercase">Multiplier x{((isOverdrive ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1) * (timeLeft > 17 ? 3 : timeLeft > 15 ? 2 : timeLeft > 12 ? 1.5 : 1)).toFixed(1)}</span>
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

        {/* Power-ups Bar */}
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

        {/* Main Arena */}
        <motion.div 
          className={`glass-elevated p-10 rounded-[2.5rem] relative overflow-hidden transition-all duration-700 border-2 ${
            isOverdrive ? 'border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.15)] bg-orange-500/[0.02]' : 
            isDanger ? 'border-red-500/30 bg-red-500/[0.02]' : 
            isTimeCritical ? 'border-red-500/40 bg-red-500/[0.01]' : 'border-white/10'
          }`}
          animate={isShaking || (isTimeCritical && !feedback) ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
          transition={isTimeCritical ? { repeat: Infinity, duration: 0.1 } : { duration: 0.4 }}
          layout
        >
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            {isTimerPaused ? <ZapOff size={120} className="text-blue-400 rotate-12" /> : <Shield size={120} className="text-white rotate-12" />}
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute inset-0 flex flex-col items-center justify-center z-20 backdrop-blur-sm ${
                  feedback === 'correct' ? 'bg-emerald-500/10' : 
                  feedback === 'timeout' ? 'bg-amber-500/20' : 'bg-red-500/20'
                }`}
              >
                {feedback === 'correct' ? (
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    className="flex flex-col items-center"
                  >
                    <CheckCircle2 size={100} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]" />
                    <span className="mt-4 text-emerald-400 font-black italic tracking-tight text-2xl uppercase">Correct!</span>
                  </motion.div>
                ) : (
                  <div className="text-center p-8 max-w-sm">
                    {feedback === 'timeout' ? (
                      <Clock size={80} className="text-amber-400 mb-6 mx-auto animate-bounce" />
                    ) : (
                      <XCircle size={80} className="text-red-400 mb-6 mx-auto drop-shadow-[0_0_20px_rgba(248,113,113,0.4)]" />
                    )}
                    <div className="space-y-3 bg-slate-950/80 p-6 rounded-3xl border border-red-500/20 shadow-2xl">
                      <p className="text-red-400 font-black uppercase text-xs tracking-[0.2em]">
                        {feedback === 'timeout' ? 'TIME EXPIRED' : 'Correct Translation:'}
                      </p>
                      <p className="text-2xl font-black text-white leading-tight">
                        {Array.isArray(currentQ.french) ? currentQ.french[0] : currentQ.french}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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

        {/* Dynamic Background Warning */}
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
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    
    let grade = 'D';
    let gradeColor = 'text-slate-400';
    let gradeMsg = 'Survival is tough. Try again!';
    
    if (accuracy >= 90 && level >= 15) {
      grade = 'S';
      gradeColor = 'text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]';
      gradeMsg = 'LEGENDARY SURVIVOR!';
    } else if (accuracy >= 80 && level >= 8) {
      grade = 'A';
      gradeColor = 'text-purple-400';
      gradeMsg = 'Masterful performance!';
    } else if (accuracy >= 65 && level >= 4) {
      grade = 'B';
      gradeColor = 'text-blue-400';
      gradeMsg = 'Solid survival skills!';
    } else if (accuracy >= 40) {
      grade = 'C';
      gradeColor = 'text-emerald-400';
      gradeMsg = 'Keep practicing!';
    }

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-10 text-center space-y-8 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600" />
          
          <div className="relative">
            <motion.div 
              className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-white/10 relative z-10"
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <span className={`text-8xl font-black italic tracking-tighter ${gradeColor}`}>{grade}</span>
            </motion.div>
            <motion.div 
              className="absolute -top-4 -right-4 bg-orange-500 p-3 rounded-2xl shadow-xl z-20"
              initial={{ scale: 0, rotate: 45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              <Trophy size={28} className="text-white" />
            </motion.div>
            {/* Background Glow */}
            <div className={`absolute inset-0 blur-3xl opacity-20 rounded-full scale-150 ${
              grade === 'S' ? 'bg-orange-500' : grade === 'A' ? 'bg-purple-500' : 'bg-blue-500'
            }`} />
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Mission Terminated</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{gradeMsg}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10 group hover:bg-white/[0.08] transition-colors">
              <p className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest">Experience</p>
              <p className="text-4xl font-black text-white">+{score}</p>
            </div>
            <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10 group hover:bg-white/[0.08] transition-colors">
              <p className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest">Max Level</p>
              <p className="text-4xl font-black text-orange-400">{level}</p>
            </div>
            <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10 group hover:bg-white/[0.08] transition-colors">
              <p className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest">Accuracy</p>
              <p className="text-3xl font-black text-blue-400">{accuracy}%</p>
            </div>
            <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10 group hover:bg-white/[0.08] transition-colors">
              <p className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest">Streak</p>
              <p className="text-3xl font-black text-amber-400">{maxStreak}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
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
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
