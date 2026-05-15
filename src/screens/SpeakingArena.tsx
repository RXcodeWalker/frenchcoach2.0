import { useState, useEffect, useRef, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Timer, Trophy, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Flame, Zap, Shield, Sword, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import minigameQuestions from '../data/scenarios/minigameQuestions.json';
import { useRecording } from '../features/recording/useRecording';
import { Waveform } from '../features/recording/Waveform';

type GamePhase = 'idle' | 'loadout' | 'countdown' | 'playing' | 'boss_wave' | 'finished';

interface ArenaState {
  phase: GamePhase;
  wave: number;
  questionsInWave: number;
  currentIndex: number;
  questions: Question[];
  score: number;
  hype: number;
  timeLeft: number;
  streak: number;
  maxStreak: number;
  correctAnswers: number;
  totalAnswered: number;
  feedback: 'correct' | 'incorrect' | null;
  isShaking: boolean;
  selectedPowerUps: string[];
  usedPowerUps: string[];
  comboMultiplier: number;
  floatingXPs: FloatingXP[];
}

type ArenaAction = 
  | { type: 'START_LOADOUT' }
  | { type: 'TOGGLE_POWERUP', id: string }
  | { type: 'START_COUNTDOWN' }
  | { type: 'START_PLAYING', initialQuestion: Question }
  | { type: 'TICK' }
  | { type: 'CORRECT', xp: number, hypeGain: number, timeBonus: number, nextQ: Question, id: number, x: number }
  | { type: 'INCORRECT', nextQ: Question }
  | { type: 'REMOVE_XP', id: number }
  | { type: 'FINISH' }
  | { type: 'RESET', initialQuestion: Question }
  | { type: 'SET_SHAKE', value: boolean }
  | { type: 'USE_POWERUP', id: string };

const initialState: ArenaState = {
  phase: 'idle',
  wave: 1,
  questionsInWave: 0,
  currentIndex: 0,
  questions: [],
  score: 0,
  hype: 50,
  timeLeft: 60,
  streak: 0,
  maxStreak: 0,
  correctAnswers: 0,
  totalAnswered: 0,
  feedback: null,
  isShaking: false,
  selectedPowerUps: [],
  usedPowerUps: [],
  comboMultiplier: 1,
  floatingXPs: [],
};

function arenaReducer(state: ArenaState, action: ArenaAction): ArenaState {
  switch (action.type) {
    case 'START_LOADOUT':
      return { ...state, phase: 'loadout' };
    case 'TOGGLE_POWERUP':
      const exists = state.selectedPowerUps.includes(action.id);
      if (!exists && state.selectedPowerUps.length >= 2) return state;
      return {
        ...state,
        selectedPowerUps: exists 
          ? state.selectedPowerUps.filter(id => id !== action.id)
          : [...state.selectedPowerUps, action.id]
      };
    case 'START_COUNTDOWN':
      return { ...state, phase: 'countdown' };
    case 'START_PLAYING':
      return { 
        ...state, 
        phase: 'playing', 
        questions: [action.initialQuestion],
        timeLeft: 60,
        hype: 50,
        wave: 1,
        questionsInWave: 0,
        score: 0,
        streak: 0,
        correctAnswers: 0,
        totalAnswered: 0,
        usedPowerUps: []
      };
    case 'TICK':
      if (state.timeLeft <= 0) return { ...state, phase: 'finished', timeLeft: 0 };
      return { 
        ...state, 
        timeLeft: state.timeLeft - 1,
        hype: Math.max(0, state.hype - 0.5)
      };
    case 'CORRECT':
      const newStreak = state.streak + 1;
      const nextQCount = state.questionsInWave + 1;
      const isWaveComplete = nextQCount >= 5;
      const isEnteringBoss = isWaveComplete && state.wave % 5 === 4; // Wave 5, 10... (next wave will be 5, 10)
      
      let comboMult = 1;
      if (newStreak >= 10) comboMult = 3;
      else if (newStreak >= 5) comboMult = 2;
      else if (newStreak >= 3) comboMult = 1.5;

      return {
        ...state,
        score: state.score + action.xp,
        streak: newStreak,
        maxStreak: Math.max(state.maxStreak, newStreak),
        correctAnswers: state.correctAnswers + 1,
        totalAnswered: state.totalAnswered + 1,
        hype: Math.min(100, state.hype + action.hypeGain),
        timeLeft: state.timeLeft + action.timeBonus + (isWaveComplete ? 10 : 0),
        feedback: 'correct',
        wave: isWaveComplete ? state.wave + 1 : state.wave,
        questionsInWave: isWaveComplete ? 0 : nextQCount,
        questions: [...state.questions, action.nextQ],
        currentIndex: state.currentIndex + 1,
        comboMultiplier: comboMult,
        floatingXPs: [...state.floatingXPs, { id: action.id, amount: action.xp, x: action.x, y: 0 }],
        phase: isEnteringBoss ? 'boss_wave' : state.phase
      };
    case 'INCORRECT':
      return {
        ...state,
        totalAnswered: state.totalAnswered + 1,
        streak: 0,
        hype: Math.max(0, state.hype - 15),
        timeLeft: Math.max(0, state.timeLeft - 5),
        feedback: 'incorrect',
        isShaking: true,
        questions: [...state.questions, action.nextQ],
        currentIndex: state.currentIndex + 1,
        comboMultiplier: 1
      };
    case 'REMOVE_XP':
      return { ...state, floatingXPs: state.floatingXPs.filter(f => f.id !== action.id) };
    case 'FINISH':
      return { ...state, phase: 'finished' };
    case 'RESET':
      return { ...initialState, phase: 'countdown', questions: [action.initialQuestion] };
    case 'SET_SHAKE':
      return { ...state, isShaking: action.value };
    case 'USE_POWERUP':
      if (state.usedPowerUps.includes(action.id)) return state;
      
      let newState = { ...state, usedPowerUps: [...state.usedPowerUps, action.id] };
      
      if (action.id === 'time_freeze') {
        newState.timeLeft += 10; // Simple freeze = add time
      } else if (action.id === 'crowd_favor') {
        newState.hype = Math.min(100, newState.hype + 50);
      } else if (action.id === 'first_word') {
        // Handled in UI mainly, but could affect state if we track revealed words
      }
      return newState;
    default:
      return state;
  }
}

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
}

const getBigrams = (str: string) => {
  const bigrams = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
};

const diceCoefficient = (str1: string, str2: string) => {
  if (str1.length < 2 || str2.length < 2) return str1 === str2 ? 1 : 0;
  const bg1 = getBigrams(str1);
  const bg2 = getBigrams(str2);
  let intersection = 0;
  for (const bg of bg1) {
    if (bg2.has(bg)) intersection++;
  }
  return (2.0 * intersection) / (bg1.size + bg2.size);
};

export function SpeakingArena() {
  const navigate = useNavigate();
  const { dispatch: appDispatch } = useApp();
  const { isRecording, transcript, start, stop, waveData } = useRecording();
  
  const [state, dispatch] = useReducer(arenaReducer, initialState);
  const [countdown, setCountdown] = useState(3);
  const [feedbackUI, setFeedbackUI] = useState<'correct' | 'incorrect' | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const lastCheckedTranscriptRef = useRef('');

  const isOverdrive = state.hype >= 80;
  const easyPool = minigameQuestions.filter(q => q.difficulty === 'easy');
  const mediumPool = minigameQuestions.filter(q => q.difficulty === 'medium');
  const hardPool = minigameQuestions.filter(q => q.difficulty === 'hard');

  const getNextQuestion = (currentWave: number) => {
    let pool = easyPool;
    if (currentWave >= 5) pool = hardPool;
    else if (currentWave >= 3) pool = mediumPool;
    
    return pool[Math.floor(Math.random() * pool.length)];
  };

  useEffect(() => {
    if (state.phase === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        dispatch({ type: 'START_PLAYING', initialQuestion: getNextQuestion(1) });
        start();
      }
    }
  }, [state.phase, countdown, start]);

  useEffect(() => {
    if (state.phase === 'playing' && state.timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [state.phase, state.timeLeft]);

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
    if (state.phase !== 'playing' || feedbackUI) return;

    const currentQ = state.questions[state.currentIndex];
    if (!currentQ) return;

    const acceptable = Array.isArray(currentQ.french) 
      ? currentQ.french.map(normalize)
      : [normalize(currentQ.french)];
    
    const normalizedTranscript = normalize(transcript);
    const relevantTranscript = normalizedTranscript.replace(normalize(lastCheckedTranscriptRef.current), '');

    const foundMatch = acceptable.some(phrase => {
      if (relevantTranscript.includes(phrase)) return true;
      const similarity = diceCoefficient(relevantTranscript, phrase);
      if (similarity > 0.8) return true;

      const words = phrase.split(' ');
      const transcriptWords = relevantTranscript.split(' ');
      return words.every(word => {
        if (word.length <= 2) return true;
        return transcriptWords.some(tWord => diceCoefficient(tWord, word) > 0.85);
      });
    });

    if (foundMatch) {
      handleCorrect();
    }
  }, [transcript, state.phase, feedbackUI, state.questions, state.currentIndex]);

  const handleCorrect = () => {
    const nextStreak = state.streak + 1;
    const hypeGain = 10 + Math.min(nextStreak, 10);
    
    let multiplier = 1;
    if (state.hype >= 80) multiplier = 3;
    else if (state.hype >= 60) multiplier = 2;
    else if (state.hype >= 40) multiplier = 1.5;

    const xpGain = Math.round(15 * multiplier);
    const nextQ = getNextQuestion(state.wave);
    const id = Date.now();

    dispatch({
      type: 'CORRECT',
      xp: xpGain,
      hypeGain,
      timeBonus: 2,
      nextQ,
      id,
      x: Math.random() * 40 - 20
    });
    
    lastCheckedTranscriptRef.current = transcript;
    setFeedbackUI('correct');
    setTimeout(() => dispatch({ type: 'REMOVE_XP', id }), 1000);
    setTimeout(() => {
      setFeedbackUI(null);
      dispatch({ type: 'SET_SHAKE', value: false });
    }, 600);
  };

  const handleSkip = () => {
    if (feedbackUI) return;
    const nextQ = getNextQuestion(state.wave);
    dispatch({ type: 'INCORRECT', nextQ });
    lastCheckedTranscriptRef.current = transcript;
    setFeedbackUI('incorrect');
    setTimeout(() => {
      setFeedbackUI(null);
      dispatch({ type: 'SET_SHAKE', value: false });
    }, 1200);
  };

  useEffect(() => {
    if (state.phase === 'finished') {
      if (state.score > 0) {
        appDispatch({ type: 'ADD_XP', amount: state.score });
      }
      stop();
    }
  }, [state.phase]);

  const resetGame = () => {
    setCountdown(3);
    dispatch({ type: 'RESET', initialQuestion: getNextQuestion(1) });
    lastCheckedTranscriptRef.current = '';
  };

  const usePowerUp = (id: string) => {
    if (state.usedPowerUps.includes(id)) return;
    dispatch({ type: 'USE_POWERUP', id });
  };

  if (state.phase === 'idle') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6 border-red-500/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <Sword size={40} className="text-red-500 fill-red-500/20" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white mb-2 italic tracking-tighter uppercase">Speaking Arena</h1>
            <p className="text-slate-400 text-sm">Survive the waves by speaking translations correctly. Keep the crowd hyped to earn massive XP!</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Shield size={18} className="text-blue-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 font-bold uppercase">Difficulty</p>
              <p className="text-lg font-black text-white">Dynamic</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Zap size={18} className="text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 font-bold uppercase">XP Reward</p>
              <p className="text-lg font-black text-white">Legendary</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={() => dispatch({ type: 'START_LOADOUT' })}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-500/20 transition-all uppercase italic tracking-wider"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ENTER THE ARENA
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

  if (state.phase === 'loadout') {
    const powerUps = [
      { id: 'time_freeze', name: 'Time Freeze', icon: Timer, desc: 'Add 10s to the clock', color: 'text-blue-400' },
      { id: 'crowd_favor', name: 'Crowd Favor', icon: Flame, desc: 'Instant +50% Hype', color: 'text-orange-500' },
      { id: 'first_word', name: 'First Word', icon: Sparkles, desc: 'Reveals first word', color: 'text-amber-400' },
    ];

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6 border-red-500/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white italic uppercase">Select Loadout</h2>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{state.selectedPowerUps.length}/2</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {powerUps.map(p => {
              const isSelected = state.selectedPowerUps.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => dispatch({ type: 'TOGGLE_POWERUP', id: p.id })}
                  className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    isSelected ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-50 hover:opacity-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${p.color}`}>
                    <p.icon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white text-sm uppercase italic">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.desc}</p>
                  </div>
                  {isSelected && <CheckCircle2 size={16} className="ml-auto text-emerald-400" />}
                </button>
              );
            })}
          </div>

          <motion.button
            onClick={() => {
              setCountdown(3);
              dispatch({ type: 'START_COUNTDOWN' });
            }}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-500/20 transition-all uppercase italic tracking-wider"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            START FIGHT
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (state.phase === 'countdown') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="text-9xl font-black text-red-500 italic tracking-tighter"
          >
            {countdown === 0 ? 'FIGHT!' : countdown}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (state.phase === 'playing') {
    const currentQ = state.questions[state.currentIndex];
    const isFirstWordUsed = state.usedPowerUps.includes('first_word');
    const firstWord = typeof currentQ.french === 'string' 
      ? currentQ.french.split(' ')[0] 
      : currentQ.french[0].split(' ')[0];

    return (
      <div className={`max-w-2xl mx-auto px-4 pt-12 transition-all duration-700 ${isOverdrive ? 'bg-red-900/5' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`glass-elevated px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-500 relative ${isOverdrive ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-red-500/20'}`}>
              <Zap size={16} className={`text-amber-400 ${isOverdrive ? 'animate-pulse' : ''}`} />
              <span className="text-xl font-black text-white">{state.score}</span>
              
              <AnimatePresence>
                {state.floatingXPs.map(fxp => (
                  <motion.div
                    key={fxp.id}
                    initial={{ opacity: 0, y: 0, x: fxp.x }}
                    animate={{ opacity: 1, y: -40 }}
                    exit={{ opacity: 0 }}
                    className="absolute font-black text-amber-400 pointer-events-none text-lg"
                  >
                    +{fxp.amount}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-slate-900/50 border-red-500/30">
              <Sword size={14} className="text-red-400" />
              <span className="text-sm font-black italic tracking-tight text-red-400">WAVE {state.wave}</span>
            </div>

            {state.comboMultiplier > 1 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded italic"
              >
                x{state.comboMultiplier} COMBO
              </motion.div>
            )}
          </div>
          
          <div className={`glass-elevated px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${state.timeLeft < 10 ? 'border-red-500 animate-pulse text-red-400' : 'border-blue-500/20 text-blue-400'}`}>
            <Timer size={16} />
            <span className="text-xl font-black tabular-nums">{state.timeLeft}s</span>
          </div>
        </div>

        {/* Hype Bar */}
        <div className="mb-8 space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Flame size={12} className={state.hype > 50 ? 'text-orange-500' : 'text-slate-700'} /> CROWD HYPE
            </span>
            <span className={`text-[10px] font-black italic ${isOverdrive ? 'text-amber-400' : 'text-slate-500'}`}>
              {isOverdrive ? 'ARENA ON FIRE!' : `${Math.round(state.hype)}%`}
            </span>
          </div>
          <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
            <motion.div 
              className={`h-full rounded-full transition-colors ${state.hype < 30 ? 'bg-red-500' : state.hype < 70 ? 'bg-orange-500' : 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
              initial={{ width: '50%' }}
              animate={{ width: `${state.hype}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <motion.div 
          className={`glass-elevated p-8 rounded-2xl relative overflow-hidden transition-all duration-500 ${isOverdrive ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 'border-red-500/20'}`}
          animate={state.isShaking ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          layout
        >
          {feedbackUI && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center ${feedbackUI === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
            >
              {feedbackUI === 'correct' ? (
                <div className="flex flex-col items-center">
                  <CheckCircle2 size={80} className="text-emerald-400 mb-2" />
                  <span className="text-emerald-400 font-black italic text-xl uppercase tracking-tighter">PERFECT!</span>
                </div>
              ) : (
                <>
                  <XCircle size={60} className="text-red-400 mb-4" />
                  <div className="space-y-2">
                    <p className="text-red-300 font-bold uppercase text-[10px] tracking-widest">The crowd didn't like that!</p>
                    <p className="text-2xl font-black text-white">
                      {Array.isArray(currentQ.french) ? currentQ.french[0] : currentQ.french}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}

          <div className="text-center space-y-8">
            <div className="min-h-[120px] flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">Translate & Command the Arena</span>
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={currentQ?.english}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-3xl md:text-4xl font-black text-white leading-tight italic uppercase tracking-tight"
                >
                  {currentQ?.english}
                </motion.h2>
              </AnimatePresence>
              {isFirstWordUsed && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-amber-400 font-bold text-sm mt-2"
                >
                  Hint: Starts with "{firstWord}..."
                </motion.p>
              )}
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-xs h-12">
                <Waveform data={waveData} isRecording={isRecording} />
              </div>
              
              <div className="min-h-[40px] px-4 py-2 rounded-lg bg-white/5 border border-white/5 w-full">
                <p className="text-slate-400 text-sm italic font-medium">
                  {transcript || "The arena is listening..."}
                </p>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">STREAK</p>
                  <p className="text-2xl font-black text-orange-500 italic">{state.streak}</p>
                </div>
                <button 
                  onClick={handleSkip}
                  className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Skip (-5s)
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">WAVE PROGRESS</p>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full ${i <= state.questionsInWave ? 'bg-red-500' : 'bg-white/10'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Power Ups UI */}
        <div className="flex justify-center gap-4 mt-8">
          {state.selectedPowerUps.map(pid => {
            const isUsed = state.usedPowerUps.includes(pid);
            return (
              <button 
                key={pid}
                onClick={() => usePowerUp(pid)}
                disabled={isUsed}
                className={`w-14 h-14 rounded-2xl glass border flex flex-col items-center justify-center transition-all ${
                  isUsed ? 'opacity-20 border-white/5 grayscale' : 'border-white/10 text-white hover:border-white/30 hover:scale-110 active:scale-95'
                }`}
              >
                {pid === 'time_freeze' && <Timer size={20} className="text-blue-400" />}
                {pid === 'crowd_favor' && <Flame size={20} className="text-orange-500" />}
                {pid === 'first_word' && <Sparkles size={20} className="text-amber-400" />}
                <span className="text-[7px] font-bold uppercase mt-1">{pid.replace('_', ' ')}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (state.phase === 'finished') {
    const accuracy = state.totalAnswered > 0 ? Math.round((state.correctAnswers / state.totalAnswered) * 100) : 0;
    
    let grade = 'D';
    let gradeColor = 'text-slate-400';
    
    if (accuracy >= 90 && state.wave >= 5 && state.totalAnswered >= 20) {
      grade = 'S';
      gradeColor = 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    } else if (accuracy >= 80 && state.wave >= 3) {
      grade = 'A';
      gradeColor = 'text-purple-400';
    } else if (accuracy >= 65 && state.wave >= 2) {
      grade = 'B';
      gradeColor = 'text-blue-400';
    } else if (accuracy >= 40) {
      grade = 'C';
      gradeColor = 'text-emerald-400';
    }

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6 border-red-500/20"
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
            <h1 className="text-3xl font-black text-white mb-1 uppercase italic tracking-tighter">Arena Survival Complete</h1>
            <p className="text-slate-400 text-sm">You've reached <span className={`font-bold ${gradeColor}`}>Wave {state.wave}</span> with a {grade} Rank!</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total XP</p>
              <p className="text-3xl font-black text-white">+{state.score}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Waves Cleared</p>
              <p className="text-3xl font-black text-red-400">{state.wave - 1}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Accuracy</p>
              <p className="text-2xl font-black text-blue-400">{accuracy}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Max Streak</p>
              <p className="text-2xl font-black text-orange-400">{state.maxStreak}</p>
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
              RE-ENTER ARENA
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
