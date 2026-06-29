import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Zap, Play, RotateCcw, Trophy, AlertTriangle, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { awardXP, checkAchievements, getProgressionState } from '../services/progression/progressionService';
import { recordSession as persistSession } from '../services/analytics/analyticsService';
import { buildAchievementContext } from '../services/coach/achievementContextBuilder';

interface FallingWord {
  id: string;
  french: string;
  english: string[];
  x: number;
  y: number;
  speed: number;
}

const VOCABULARY = [
  { fr: 'chat', en: ['cat'] },
  { fr: 'chien', en: ['dog'] },
  { fr: 'maison', en: ['house'] },
  { fr: 'école', en: ['school'] },
  { fr: 'manger', en: ['to eat', 'eat'] },
  { fr: 'boire', en: ['to drink', 'drink'] },
  { fr: 'pomme', en: ['apple'] },
  { fr: 'rouge', en: ['red'] },
  { fr: 'bleu', en: ['blue'] },
  { fr: 'vert', en: ['green'] },
  { fr: 'merci', en: ['thank you', 'thanks'] },
  { fr: 'bonjour', en: ['hello', 'good morning'] },
  { fr: 'travail', en: ['work', 'job'] },
  { fr: 'livre', en: ['book'] },
  { fr: 'ami', en: ['friend'] },
  { fr: 'famille', en: ['family'] },
  { fr: 'temps', en: ['time', 'weather'] },
  { fr: 'ville', en: ['city', 'town'] },
  { fr: 'pays', en: ['country'] },
  { fr: 'monde', en: ['world'] },
  { fr: 'homme', en: ['man'] },
  { fr: 'femme', en: ['woman'] },
  { fr: 'enfant', en: ['child'] },
  { fr: 'petit', en: ['small', 'little'] },
  { fr: 'grand', en: ['big', 'large', 'tall'] },
  { fr: 'nouveau', en: ['new'] },
  { fr: 'vieux', en: ['old'] },
  { fr: 'bon', en: ['good'] },
  { fr: 'mauvais', en: ['bad'] },
  { fr: 'heureux', en: ['happy'] },
  { fr: 'triste', en: ['sad'] },
  { fr: 'rapide', en: ['fast', 'quick'] },
  { fr: 'lent', en: ['slow'] },
];

export function WordDrop() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [difficulty, setDifficulty] = useState(1);
  const [shake, setShake] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [isFunMode, setIsFunMode] = useState(false);
  const [lastMissed, setLastMissed] = useState<{ fr: string; en: string } | null>(null);

  const spawnWord = useCallback(() => {
    if (!isPlaying || gameOver) return;

    const randomWord = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];
    const id = Math.random().toString(36).substr(2, 9);
    const x = Math.random() * 80 + 10; // 10% to 90%
    
    const speedMult = gameSpeed === 'slow' ? 0.7 : gameSpeed === 'fast' ? 1.4 : 1.0;
    const speed = (0.5 + Math.random() * 0.5 + (difficulty * 0.2)) * speedMult;

    setFallingWords(prev => [
      ...prev,
      { id, french: randomWord.fr, english: randomWord.en, x, y: -10, speed }
    ]);
  }, [isPlaying, gameOver, difficulty, gameSpeed]);

  // Game Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const interval = setInterval(() => {
      setFallingWords(prev => {
        const next = prev.map(w => {
          let currentSpeed = w.speed;
          
          // Fun Mode: Random speed fluctuations
          if (isFunMode && Math.random() < 0.02) {
            const fluctuation = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
            currentSpeed = Math.max(0.3, Math.min(2.5, currentSpeed * fluctuation));
          }
          
          return { ...w, y: w.y + currentSpeed, speed: currentSpeed };
        });
        
        // Check for words hitting the bottom
        const missed = next.filter(w => w.y > 100);
        if (missed.length > 0) {
          // Show translation for the first missed word
          setLastMissed({ fr: missed[0].french, en: missed[0].english[0] });
          setTimeout(() => setLastMissed(null), 2000);

          setLives(l => {
            const newLives = l - missed.length;
            if (newLives <= 0) {
              setGameOver(true);
              setIsPlaying(false);
              return 0;
            }
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return newLives;
          });
          return next.filter(w => w.y <= 100);
        }
        
        return next;
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isPlaying, gameOver, isFunMode]);

  // Spawning Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const spawnRate = Math.max(1000, 3000 - (difficulty * 300));
    const interval = setInterval(spawnWord, spawnRate);

    return () => clearInterval(interval);
  }, [isPlaying, gameOver, difficulty, spawnWord]);

  // Difficulty scaling
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const interval = setInterval(() => {
      setDifficulty(d => d + 0.1);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, gameOver]);

  // Auto-focus input
  useEffect(() => {
    if (isPlaying && !gameOver) {
      inputRef.current?.focus();
    }
  }, [isPlaying, gameOver]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().trim();
    setInputValue(e.target.value);

    const match = fallingWords.find(w => w.english.some(en => en.toLowerCase() === val));
    if (match) {
      setFallingWords(prev => prev.filter(w => w.id !== match.id));
      setScore(s => s + 10);
      setInputValue('');
    }
  };

  const startGame = () => {
    setScore(0);
    setLives(3);
    setFallingWords([]);
    setGameOver(false);
    setIsPlaying(true);
    setDifficulty(1);
    setInputValue('');
  };

  const handleGameOver = useCallback(() => {
    const sessionScore = Math.min(10, score / 20);
    const session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: 'word_drop' as const,
      wordCount: Math.floor(score / 10),
      score: sessionScore,
      xpEarned: 0,
      durationSec: 0,
      createdAt: new Date().toISOString(),
    };
    persistSession(session);
    const xpResult = awardXP(sessionScore, state.profile.streak_days);
    const { level: newLevel } = getProgressionState();
    const newUnlockedAchievementIds = checkAchievements(
      buildAchievementContext({
        finalScore: sessionScore,
        streakDays: state.profile.streak_days,
        totalSessionsAfter: state.profile.sessions_count + 1,
        topicsUsed: [],
        beliefSnapshot: null,
        examCompleted: false,
        examType: null,
      }),
    );
    dispatch({ type: 'ADD_SESSION', session: { ...session, xpEarned: xpResult.gain }, xpResult, newUnlockedAchievementIds, newLevelName: newLevel.name });
  }, [score, state.profile.streak_days, state.profile.sessions_count, dispatch]);

  useEffect(() => {
    if (gameOver) {
      handleGameOver();
    }
  }, [gameOver, handleGameOver]);

  return (
    <div className={`min-h-[80vh] flex flex-col p-4 relative transition-all duration-300 ${shake ? 'bg-red-500/10' : ''}`}>
      <div className="absolute top-8 left-4 md:left-8 z-50">
        <button 
          onClick={() => navigate('/explore')}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full flex flex-col h-[75vh]">
        {/* Header Stats */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              Word Drop <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">BETA</span>
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Type the translation!</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score</p>
              <p className="text-2xl font-black text-emerald-400">{score}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lives</p>
              <div className="flex gap-1 justify-end">
                {[...Array(3)].map((_, i) => (
                  <Heart 
                    key={i} 
                    size={16} 
                    className={`${i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-800'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div 
          ref={containerRef}
          className="flex-1 glass-elevated rounded-3xl relative overflow-hidden border-white/5 bg-slate-950/20"
        >
          <AnimatePresence>
            {!isPlaying && !gameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border-2 border-emerald-500/20">
                  <Zap size={40} className="text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">Ready?</h2>
                <p className="text-slate-400 text-sm mb-8 max-w-xs">
                  French words will fall from the sky. Type their English meaning to clear them!
                </p>

                <div className="flex flex-col gap-6 mb-8 w-full max-w-xs">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Game Speed</p>
                    <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                      {(['slow', 'normal', 'fast'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setGameSpeed(s)}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                            gameSpeed === s ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsFunMode(!isFunMode)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      isFunMode ? 'bg-violet-500/10 border-violet-500/50 text-violet-400' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={18} className={isFunMode ? 'animate-pulse' : ''} />
                      <div className="text-left">
                        <p className="text-xs font-black uppercase tracking-tighter">Fun Mode</p>
                        <p className="text-[10px] font-medium opacity-60">Random speed changes!</p>
                      </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${isFunMode ? 'bg-violet-500' : 'bg-slate-800'}`}>
                      <motion.div 
                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                        animate={{ x: isFunMode ? 16 : 0 }}
                      />
                    </div>
                  </button>
                </div>

                <motion.button
                  onClick={startGame}
                  className="px-8 py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-all flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play size={20} fill="currentColor" />
                  START GAME
                </motion.button>
              </motion.div>
            )}

            {gameOver && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 bg-slate-950/80 backdrop-blur-sm"
              >
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border-2 border-rose-500/20">
                  <AlertTriangle size={40} className="text-rose-400" />
                </div>
                <h2 className="text-4xl font-black text-white mb-2">Game Over!</h2>
                <div className="flex gap-8 mb-8">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Final Score</p>
                    <p className="text-3xl font-black text-white">{score}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">XP Gained</p>
                    <p className="text-3xl font-black text-emerald-400">+{Math.floor(score / 2)}</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <button
                    onClick={startGame}
                    className="flex-1 py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={18} />
                    TRY AGAIN
                  </button>
                  <button
                    onClick={() => navigate('/explore')}
                    className="flex-1 py-4 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Trophy size={18} />
                    EXIT
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Falling Words */}
          {fallingWords.map(word => (
          <motion.div
            key={word.id}
            className="absolute"
            style={{ left: `${word.x}%`, top: `${word.y}%` }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl shadow-2xl">
              <span className="text-lg font-black text-white">{word.french}</span>
            </div>
          </motion.div>
          ))}

          {/* Missed Word Feedback */}
          <AnimatePresence>
          {lastMissed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-6 left-0 right-0 flex justify-center z-10"
            >
              <div className="bg-rose-500/20 backdrop-blur-md border border-rose-500/30 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Missed</span>
                  <span className="text-sm font-black text-white">{lastMissed.fr}</span>
                </div>
                <div className="h-8 w-px bg-rose-500/30" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Translation</span>
                  <span className="text-sm font-black text-white">{lastMissed.en}</span>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
          </div>
        {/* Input Area */}
        <div className="mt-6 flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            disabled={!isPlaying || gameOver}
            placeholder={isPlaying ? "Type translation here..." : "Game paused"}
            className="flex-1 bg-navy-200 border-2 border-white/5 rounded-2xl px-6 py-4 text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all disabled:opacity-50"
          />
          <button 
            onClick={() => setIsPlaying(p => !p)}
            className="p-4 bg-navy-200 border-2 border-white/5 rounded-2xl text-slate-400 hover:text-white transition-colors"
          >
            {isPlaying ? <Zap size={24} /> : <Play size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}
