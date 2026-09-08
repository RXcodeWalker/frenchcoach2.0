import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Timer, Mic, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Zap, Volume2, Shield, Snowflake } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useRecording } from '../features/recording/useRecording';
import { Waveform } from '../features/recording/Waveform';
import { getSpeedSpeakingPool, getNextSpeedQuestion, SpeedQuestion } from '../data/speedSpeakingData';
import { TTS } from '../services/tts/ttsService';
import {
  matchTranscriptDelta,
  getStreakMultiplier,
  STANDARD_STREAK_TIERS,
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
  GameResultsCard,
  FloatingXPOverlay,
  StreakBadge,
  GameTimerBar,
} from '../features/minigames';

type GameState = 'idle' | 'countdown' | 'playing' | 'finished';

export function SpeedSpeaking() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const { isRecording, transcript, start, stop, waveData, micLevel } = useRecording();

  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [isTimeFrozen, setIsTimeFrozen] = useState(false);

  const lastCheckedTranscriptRef = useRef('');
  const poolRef = useRef<SpeedQuestion[]>([]);

  const {
    streak,
    maxStreak,
    isOverdrive,
    onCorrect: onStreakCorrect,
    onIncorrect: onStreakIncorrect,
    reset: resetStreak,
  } = useStreakMultiplier({ tiers: STANDARD_STREAK_TIERS });

  const { items: floatingXPs, add: addFloatingXP } = useFloatingXP();

  const timer = useGameTimer({
    mode: 'global',
    initialSeconds: 60,
    active: gameState === 'playing',
    paused: isTimeFrozen,
    onExpire: () => {
      setGameState('finished');
      stop();
    },
  });

  const countdown = useCountdown({
    onComplete: () => {
      setGameState('playing');
      timer.reset(60);
      start();
    },
  });

  useEffect(() => {
    poolRef.current = getSpeedSpeakingPool();
    const firstQ = getNextSpeedQuestion(0, poolRef.current);
    setQuestions([firstQ]);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing' || feedback) return;

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    if (matchTranscriptDelta(transcript, lastCheckedTranscriptRef.current, currentQ.french)) {
      handleCorrect();
    }
  }, [transcript, gameState, feedback, questions, currentIndex]);

  const addFloatingText = (text: string, type: 'xp' | 'time' | 'combo' = 'xp', amount?: number) => {
    addFloatingXP({
      text,
      type,
      amount: amount || 0,
      x: Math.random() * 60 - 30,
    });
  };

  const handleCorrect = () => {
    setTotalAnswered((prev) => prev + 1);
    setCorrectAnswers((prev) => prev + 1);
    const newStreak = streak + 1;
    onStreakCorrect();
    const multiplier = getStreakMultiplier(newStreak, STANDARD_STREAK_TIERS);
    const xpGain = Math.round(10 * multiplier);
    setScore((s) => s + xpGain);
    setFeedback('correct');

    lastCheckedTranscriptRef.current = transcript;

    addFloatingText(`+${xpGain} XP`, 'xp', xpGain);

    if (newStreak % 5 === 0) {
      timer.addTime(5);
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
      setQuestions((prev) => [...prev, nextQ]);
      setCurrentIndex((prev) => prev + 1);
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
        setQuestions((prev) => [...prev, nextQ]);
        setCurrentIndex((prev) => prev + 1);
      }, 600);
      return;
    }

    setTotalAnswered((prev) => prev + 1);
    onStreakIncorrect();
    setFeedback('incorrect');
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    timer.subtractTime(3);

    const answer = Array.isArray(currentQ.french) ? currentQ.french[0] : currentQ.french;
    TTS.speak(answer);

    lastCheckedTranscriptRef.current = transcript;

    setTimeout(() => {
      setFeedback(null);
      const nextQ = getNextSpeedQuestion(0, poolRef.current);
      setQuestions((prev) => [...prev, nextQ]);
      setCurrentIndex((prev) => prev + 1);
    }, 1500);
  };

  useEffect(() => {
    if (gameState === 'finished') {
      completeMinigameSession({ dispatch, score });
      stop();
    }
  }, [gameState, dispatch, score, stop]);

  const startChallenge = () => {
    setGameState('countdown');
    countdown.start();
  };

  const resetGame = () => {
    const firstQ = getNextSpeedQuestion(0, poolRef.current);
    setQuestions([firstQ]);
    setCurrentIndex(0);
    setScore(0);
    resetStreak();
    setCorrectAnswers(0);
    setTotalAnswered(0);
    setHasShield(false);
    setIsTimeFrozen(false);
    lastCheckedTranscriptRef.current = '';
    setGameState('countdown');
    countdown.start();
  };

  if (gameState === 'idle') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full surface-raised p-8 text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
            <Mic size={40} className="text-blue-400 fill-blue-400/20" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter uppercase">Speed Speaking 2.0</h1>
            <p className="text-ink-muted text-sm">Speak the translations as fast as you can. Use the streak to earn Power-ups!</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Timer size={18} className="text-blue-400 mx-auto mb-1" />
              <p className="text-[10px] text-ink-muted font-bold uppercase">Time Limit</p>
              <p className="text-lg font-black text-white">60s</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Zap size={18} className="text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] text-ink-muted font-bold uppercase">XP Reward</p>
              <p className="text-lg font-black text-white">Massive</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={startChallenge}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all uppercase italic tracking-wider"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              START CHALLENGE
            </motion.button>
            <button
              onClick={() => navigate('/explore')}
              className="text-xs font-bold text-ink-muted hover:text-white transition-colors flex items-center justify-center gap-1.5"
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
      <GameCountdown
        display={countdown.display}
        value={countdown.value}
        textClassName="text-9xl font-black text-blue-400 italic tracking-tighter"
      />
    );
  }

  if (gameState === 'playing') {
    const currentQ = questions[currentIndex];

    return (
      <div className="max-w-2xl mx-auto px-4 pt-12 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`surface-raised px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-500 relative ${isOverdrive ? getOverdriveClasses(true) : 'border-blue-500/20'}`}>
              <Zap size={16} className={`text-amber-400 ${isOverdrive ? 'animate-pulse' : ''}`} />
              <span className="text-xl font-black text-white">{score}</span>
              <FloatingXPOverlay items={floatingXPs} animateY={-60} />
            </div>

            <StreakBadge streak={streak} isOverdrive={isOverdrive} />
          </div>

          <div
            className={`surface-raised px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
              isTimeFrozen
                ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400'
                : timer.isCritical
                  ? 'border-red-500 animate-pulse text-red-400'
                  : 'border-blue-500/20 text-blue-400'
            }`}
          >
            {isTimeFrozen ? <Snowflake size={16} className="animate-spin" /> : <Timer size={16} />}
            <span className="text-xl font-black tabular-nums">{timer.timeLeft}s</span>
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

        <GameTimerBar
          timeLeft={timer.timeLeft}
          maxTime={timer.maxTime}
          isCritical={timer.isCritical}
          isOverdrive={isOverdrive}
          accentColor="blue"
          showLabel={false}
          className="mb-8"
        />

        <motion.div
          className={`surface-raised p-8 rounded-2xl relative overflow-hidden transition-all duration-500 ${getOverdriveCardClasses(isOverdrive)}`}
          animate={isShaking ? shakeAnimation : { x: 0 }}
          transition={shakeTransition}
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
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.2em] mb-3 block">Translate & Speak</span>
              <AnimatePresence mode="wait">
                <motion.h2
                  key={currentQ?.english}
                  initial={{ x: 30, opacity: 0, filter: 'blur(10px)' }}
                  animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ x: -30, opacity: 0, filter: 'blur(10px)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="text-3xl md:text-4xl font-black text-white leading-tight italic"
                >
                  {currentQ?.english}
                </motion.h2>
              </AnimatePresence>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-xs h-12">
                <Waveform data={waveData} isRecording={isRecording} source={micLevel} />
              </div>

              <div className="min-h-[40px] px-4 py-2 rounded-lg bg-white/5 border border-white/5 w-full">
                <p className="text-ink-muted text-sm italic font-medium">
                  {transcript || 'Listening...'}
                </p>
              </div>

              <button onClick={handleSkip} className="group flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-ink-muted group-hover:text-white transition-colors uppercase tracking-widest">
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
    const graded = gradeFromStats(
      { score, correctAnswers, totalAnswered, maxStreak, accuracy: 0 },
      RUBRICS.speedSpeaking,
      'speedSpeaking'
    );

    return (
      <GameResultsCard
        grade={graded.grade}
        gradeColor={graded.gradeColor}
        title="Mission Accomplished"
        subtitle={
          <>
            Rank attained: <span className={`font-bold ${graded.gradeColor}`}>{graded.grade}</span>
          </>
        }
        stats={[
          { label: 'Total XP', value: `+${score}`, valueClassName: 'text-3xl' },
          { label: 'Max Streak', value: maxStreak, valueClassName: 'text-3xl text-orange-400' },
          { label: 'Accuracy', value: `${graded.accuracy}%`, valueClassName: 'text-2xl text-blue-400' },
          { label: 'Phrases', value: `${correctAnswers}/${totalAnswered}`, valueClassName: 'text-2xl' },
        ]}
        actions={
          <>
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
          </>
        }
      />
    );
  }

  return null;
}
