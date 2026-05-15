import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Timer, Mic, Trophy, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Flame, Zap, Volume2, Shield, Snowflake } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useRecording } from '../features/recording/useRecording';
import { Waveform } from '../features/recording/Waveform';
import { getSpeedSpeakingPool, getNextSpeedQuestion, SpeedQuestion } from '../data/speedSpeakingData';
import { TTS } from '../services/tts/ttsService';

type GameState = 'idle' | 'countdown' | 'playing' | 'finished';

interface FloatingXP {
  id: number;
  amount: number;
  x: number;
  y: number;
  type?: 'xp' | 'time' | 'combo';
  text?: string;
}

export function SpeedSpeaking() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const { isRecording, transcript, start, stop, waveData } = useRecording();
  
  const [gameState, setGameState] = useState<GameState>('idle');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [isTimeFrozen, setIsTimeFrozen] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const lastCheckedTranscriptRef = useRef('');
  const poolRef = useRef<SpeedQuestion[]>([]);

  const isOverdrive = streak >= 10;

  useEffect(() => {
    poolRef.current = getSpeedSpeakingPool();
    const firstQ = getNextSpeedQuestion(0, poolRef.current);
    setQuestions([firstQ]);
  }, []);

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState('playing');
        setTimeLeft(60);
        start();
      }
    }
  }, [gameState, countdown, start]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        if (isTimeFrozen) return;
        
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('finished');
            stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState, timeLeft, stop, isTimeFrozen]);

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .replace(/\s{2,}/g, " ");
  };

  useEffect(() => {
    if (gameState !== 'playing' || feedback) return;

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const acceptable = Array.isArray(currentQ.french) 
      ? currentQ.french.map(normalize)
      : [normalize(currentQ.french)];
    
    const normalizedTranscript = normalize(transcript);
    const relevantTranscript = normalizedTranscript.replace(normalize(lastCheckedTranscriptRef.current), '');

    const foundMatch = acceptable.some(phrase => relevantTranscript.includes(phrase));

    if (foundMatch) {
      handleCorrect();
    }
  }, [transcript, gameState, feedback, questions, currentIndex]);

  const addFloatingText = (text: string, type: 'xp' | 'time' | 'combo' = 'xp', amount?: number) => {
    const id = Date.now() + Math.random();
    setFloatingXPs(prev => [...prev, { 
      id, 
      amount: amount || 0, 
      text,
      type,
      x: Math.random() * 60 - 30, 
      y: 0 
    }]);
    setTimeout(() => setFloatingXPs(prev => prev.filter(f => f.id !== id)), 1000);
  };

  const handleCorrect = () => {
    setTotalAnswered(prev => prev + 1);
    setCorrectAnswers(prev => prev + 1);
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak > maxStreak) setMaxStreak(newStreak);

    let multiplier = 1;
    if (newStreak >= 10) multiplier = 3;
    else if (newStreak >= 5) multiplier = 2;
    else if (newStreak >= 3) multiplier = 1.5;

    const xpGain = Math.round(10 * multiplier);
    setScore(s => s + xpGain);
    setFeedback('correct');
    
    lastCheckedTranscriptRef.current = transcript;

    addFloatingText(`+${xpGain} XP`, 'xp', xpGain);

    if (newStreak % 5 === 0) {
      setTimeLeft(prev => prev + 5);
      addFloatingText('+5s', 'time');
    }

    if (newStreak === 5) addFloatingText('GREAT!', 'combo');
    if (newStreak === 10) addFloatingText('UNSTOPPABLE!', 'combo');
    if (newStreak === 15) {
      addFloatingText('TIME FREEZE!', 'combo');
      setIsTimeFrozen(true);
      setTimeout(() => setIsTimeFrozen(false), 5000);
    }
    if (newStreak === 20) {
      addFloatingText('SHIELD ACTIVATED!', 'combo');
      setHasShield(true);
    }

    setTimeout(() => {
      setFeedback(null);
      const nextQ = getNextSpeedQuestion(newStreak, poolRef.current);
      setQuestions(prev => [...prev, nextQ]);
      setCurrentIndex(prev => prev + 1);
    }, 600);
  };

  const handleSkip = () => {
    if (feedback) return;
    const currentQ = questions[currentIndex];
    
    if (hasShield) {
      setHasShield(false);
      addFloatingText('SHIELD USED!', 'combo');
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        const nextQ = getNextSpeedQuestion(streak, poolRef.current);
        setQuestions(prev => [...prev, nextQ]);
        setCurrentIndex(prev => prev + 1);
      }, 600);
      return;
    }

    setTotalAnswered(prev => prev + 1);
    setStreak(0);
    setFeedback('incorrect');
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setTimeLeft(prev => Math.max(0, prev - 3));
    
    const answer = Array.isArray(currentQ.french) ? currentQ.french[0] : currentQ.french;
    TTS.speak(answer);

    lastCheckedTranscriptRef.current = transcript;

    setTimeout(() => {
      setFeedback(null);
      const nextQ = getNextSpeedQuestion(0, poolRef.current);
      setQuestions(prev => [...prev, nextQ]);
      setCurrentIndex(prev => prev + 1);
    }, 1500);
  };

  const finishGame = () => {
    if (score > 0) {
      dispatch({ 
        type: 'ADD_XP', 
        amount: score
      });
    }
    stop();
  };

  useEffect(() => {
    if (gameState === 'finished') {
      finishGame();
    }
  }, [gameState]);

  const resetGame = () => {
    const firstQ = getNextSpeedQuestion(0, poolRef.current);
    setQuestions([firstQ]);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectAnswers(0);
    setTotalAnswered(0);
    setCountdown(3);
    setGameState('countdown');
    lastCheckedTranscriptRef.current = '';
  };

  if (gameState === 'idle') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
            <Mic size={40} className="text-blue-400 fill-blue-400/20" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter uppercase">Speed Speaking 2.0</h1>
            <p className="text-slate-400 text-sm">Speak the translations as fast as you can. Use the streak to earn Power-ups!</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Timer size={18} className="text-blue-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 font-bold uppercase">Time Limit</p>
              <p className="text-lg font-black text-white">60s</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Zap size={18} className="text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 font-bold uppercase">XP Reward</p>
              <p className="text-lg font-black text-white">Massive</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={() => setGameState('countdown')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all uppercase italic tracking-wider"
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
      <div className="min-h-[80vh] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="text-9xl font-black text-blue-400 italic tracking-tighter"
          >
            {countdown === 0 ? 'GO!' : countdown}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (gameState === 'playing') {
    const currentQ = questions[currentIndex];
    const timeProgress = (timeLeft / 60) * 100;
    
    return (
      <div className="max-w-2xl mx-auto px-4 pt-12 relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <motion.div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 transition-colors duration-1000 ${
              isOverdrive ? 'bg-amber-500' : streak >= 5 ? 'bg-purple-500' : 'bg-blue-500'
            }`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`glass-elevated px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-500 relative ${isOverdrive ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-blue-500/20'}`}>
              <Zap size={16} className={`text-amber-400 ${isOverdrive ? 'animate-pulse' : ''}`} />
              <span className="text-xl font-black text-white">{score}</span>
              
              <AnimatePresence>
                {floatingXPs.map(fxp => (
                  <motion.div
                    key={fxp.id}
                    initial={{ opacity: 0, y: 0, x: fxp.x }}
                    animate={{ opacity: 1, y: -60 }}
                    exit={{ opacity: 0 }}
                    className={`absolute font-black pointer-events-none whitespace-nowrap ${
                      fxp.type === 'time' ? 'text-blue-400 text-lg' : 
                      fxp.type === 'combo' ? 'text-purple-400 text-2xl italic' :
                      'text-amber-400 text-lg'
                    }`}
                  >
                    {fxp.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {streak >= 2 && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-500 ${isOverdrive ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}
              >
                <Flame size={14} className={isOverdrive ? 'fill-slate-950' : 'fill-orange-400/20'} />
                <span className="text-sm font-black italic tracking-tight">{isOverdrive ? 'OVERDRIVE!' : `${streak} COMBO`}</span>
              </motion.div>
            )}
          </div>
          
          <div className={`glass-elevated px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
            isTimeFrozen ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400' :
            timeLeft < 10 ? 'border-red-500 animate-pulse text-red-400' : 
            'border-blue-500/20 text-blue-400'
          }`}>
            {isTimeFrozen ? <Snowflake size={16} className="animate-spin" /> : <Timer size={16} />}
            <span className="text-xl font-black tabular-nums">{timeLeft}s</span>
          </div>
        </div>

        <AnimatePresence>
          {hasShield && (
            <motion.div 
              initial={{ scale: 0, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: -20 }}
              className="flex items-center gap-2 mb-4 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-sm w-fit mx-auto"
            >
              <Shield size={16} fill="currentColor" className="opacity-20" />
              SHIELD ACTIVE
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full h-2 bg-white/5 rounded-full mb-8 overflow-hidden border border-white/5">
          <motion.div 
            className={`h-full transition-colors ${timeLeft < 10 ? 'bg-red-500' : isOverdrive ? 'bg-amber-400' : 'bg-blue-500'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${timeProgress}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>

        <motion.div 
          className={`glass-elevated p-8 rounded-2xl relative overflow-hidden transition-all duration-500 ${isOverdrive ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : ''}`}
          animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          layout
        >
          {feedback && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center ${feedback === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
            >
              {feedback === 'correct' ? (
                <CheckCircle2 size={80} className="text-emerald-400" />
              ) : (
                <>
                  <XCircle size={60} className="text-red-400 mb-4" />
                  <div className="space-y-3">
                    <p className="text-red-300 font-bold uppercase text-[10px] tracking-widest">Listen to correct answer:</p>
                    <div className="flex items-center justify-center gap-3">
                      <p className="text-2xl font-black text-white">
                        {Array.isArray(currentQ.french) ? currentQ.french[0] : currentQ.french}
                      </p>
                      <Volume2 size={24} className="text-blue-400 animate-pulse" />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          <div className="text-center space-y-8">
            <div className="min-h-[120px] flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">Translate & Speak</span>
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={currentQ?.english}
                  initial={{ x: 30, opacity: 0, filter: 'blur(10px)' }}
                  animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ x: -30, opacity: 0, filter: 'blur(10px)' }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="text-3xl md:text-4xl font-black text-white leading-tight italic"
                >
                  {currentQ?.english}
                </motion.h2>
              </AnimatePresence>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-xs h-12">
                <Waveform data={waveData} isRecording={isRecording} />
              </div>
              
              <div className="min-h-[40px] px-4 py-2 rounded-lg bg-white/5 border border-white/5 w-full">
                <p className="text-slate-400 text-sm italic font-medium">
                  {transcript || "Listening..."}
                </p>
              </div>

              <button 
                onClick={handleSkip}
                className="group flex flex-col items-center gap-2"
              >
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-white transition-colors uppercase tracking-widest">
                  Can't say it? Skip (-3s)
                </span>
                <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-red-500/20 group-hover:bg-red-500/50 transition-colors" />
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    
    let grade = 'D';
    let gradeColor = 'text-slate-400';
    
    if (accuracy >= 90 && maxStreak >= 10 && totalAnswered >= 12) {
      grade = 'S';
      gradeColor = 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    } else if (accuracy >= 80 && maxStreak >= 5) {
      grade = 'A';
      gradeColor = 'text-purple-400';
    } else if (accuracy >= 65 && totalAnswered >= 4) {
      grade = 'B';
      gradeColor = 'text-blue-400';
    } else if (accuracy >= 40) {
      grade = 'C';
      gradeColor = 'text-emerald-400';
    }

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="relative">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
              <span className={`text-6xl font-black italic ${gradeColor}`}>{grade}</span>
            </div>
            <motion.div 
              className="absolute -top-2 -right-2 bg-slate-900 border border-white/10 p-2 rounded-lg"
              initial={{ rotate: 20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              <Trophy size={20} className="text-amber-400" />
            </motion.div>
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-white mb-1 uppercase italic tracking-tighter">Mission Accomplished</h1>
            <p className="text-slate-400 text-sm">Rank attained: <span className={`font-bold ${gradeColor}`}>{grade}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total XP</p>
              <p className="text-3xl font-black text-white">+{score}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Max Streak</p>
              <p className="text-3xl font-black text-orange-400">{maxStreak}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Accuracy</p>
              <p className="text-2xl font-black text-blue-400">{accuracy}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Phrases</p>
              <p className="text-2xl font-black text-white">{correctAnswers}/{totalAnswered}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <motion.button
              onClick={resetGame}
              className="w-full py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={18} />
              RETRY MISSION
            </motion.button>
            <button 
              onClick={() => navigate('/explore')}
              className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
            >
              EXIT TO HUB
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
