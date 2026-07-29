import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, Sparkles, CheckCircle2, XCircle, Timer, Flame, Keyboard, RefreshCcw } from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { EMOJI_QUESTIONS, EmojiQuestion } from '../data/emojiQuestions';
import { matchTypedAnswer, ModePickerGrid } from '../features/minigames';

type GameMode = 'classic' | 'reverse' | 'typing' | 'blitz';

export function EmojiMaster() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  
  const [mode, setMode] = useState<GameMode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<EmojiQuestion[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startMode = (selectedMode: GameMode) => {
    const shuffled = [...EMOJI_QUESTIONS].sort(() => Math.random() - 0.5);
    setShuffledQuestions(selectedMode === 'blitz' ? shuffled.slice(0, 50) : shuffled.slice(0, 10));
    setMode(selectedMode);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setIsFinished(false);
    setTimeLeft(60);
    
    if (selectedMode === 'blitz') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentQ = shuffledQuestions[currentIndex];

  const handleCorrect = () => {
    setScore(s => s + 1);
    setStreak(s => {
      const newStreak = s + 1;
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      return newStreak;
    });
    setShowFeedback('correct');
  };

  const handleIncorrect = () => {
    setStreak(0);
    setShowFeedback('incorrect');
  };

  const nextQuestion = () => {
    setShowFeedback(null);
    setSelectedOption(null);
    setUserInput('');
    
    if (currentIndex < shuffledQuestions.length - 1 && (mode !== 'blitz' || timeLeft > 0)) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
      const xpEarned = calculateXP();
      if (xpEarned > 0) {
        dispatchAddXP(dispatch, xpEarned);
      }
    }
  };

  const calculateXP = () => {
    const baseXP = score * 10;
    const streakBonus = Math.floor(maxStreak / 5) * 20;
    const modeBonus = mode === 'typing' ? 2 : mode === 'blitz' ? 1.5 : 1;
    return Math.floor((baseXP + streakBonus) * modeBonus);
  };

  const handleOptionClick = (option: string) => {
    if (showFeedback || isFinished) return;
    
    setSelectedOption(option);
    const isCorrect = mode === 'reverse' 
      ? option === currentQ.emojis 
      : option === currentQ.french;
    
    if (isCorrect) handleCorrect();
    else handleIncorrect();

    setTimeout(nextQuestion, 1000);
  };

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showFeedback || isFinished || !userInput) return;

    const isCorrect = matchTypedAnswer(userInput, currentQ.french);
    
    if (isCorrect) handleCorrect();
    else handleIncorrect();

    setTimeout(nextQuestion, 1500);
  };

  if (!mode) {
    return (
      <ModePickerGrid
        title="Emoji Master"
        subtitle="Choose your challenge mode"
        modes={[
          {
            id: 'classic',
            icon: <Sparkles className="text-yellow-400" />,
            title: 'Classic',
            description: 'Emoji to French. The standard way to master vocabulary.',
            color: 'yellow',
          },
          {
            id: 'reverse',
            icon: <RefreshCcw className="text-blue-400" />,
            title: 'Reverse',
            description: 'French to Emoji. Think in reverse to solidify memory.',
            color: 'blue',
          },
          {
            id: 'typing',
            icon: <Keyboard className="text-purple-400" />,
            title: 'Hardcore',
            description: 'Typing mode. No options, just you and your keyboard.',
            color: 'purple',
          },
          {
            id: 'blitz',
            icon: <Timer className="text-red-400" />,
            title: 'Speed Blitz',
            description: '60 seconds. How many can you get?',
            color: 'red',
          },
        ]}
        onSelect={(id) => startMode(id as GameMode)}
        onBack={() => navigate('/explore')}
      />
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-yellow-500/20 mb-2">
            <Trophy size={48} className="text-yellow-400 fill-yellow-400/20" />
          </div>
          <h1 className="text-4xl font-black text-white">Results!</h1>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Score</p>
              <p className="text-2xl font-black text-white">{score}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Max Streak</p>
              <p className="text-2xl font-black text-orange-400">{maxStreak}</p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-1">Total XP Gained</p>
            <p className="text-3xl font-black text-white">+{calculateXP()}</p>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <motion.button
              onClick={() => {
                setMode(null);
                setIsFinished(false);
              }}
              className="w-full py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              TRY ANOTHER MODE
            </motion.button>
            <button 
              onClick={() => navigate('/explore')}
              className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
            >
              BACK TO EXPLORE
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 relative">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => setMode(null)}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex items-center gap-4">
          {mode === 'blitz' && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
              timeLeft < 10 ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-white/10 text-slate-400'
            }`}>
              <Timer size={16} />
              <span className="font-mono font-bold">{timeLeft}s</span>
            </div>
          )}
          
          <div className="glass-elevated px-4 py-1.5 rounded-full border-orange-500/20 flex items-center gap-2">
            <Flame size={14} className={streak > 0 ? "text-orange-500 fill-orange-500" : "text-slate-500"} />
            <span className="text-sm font-black text-white">{streak}</span>
          </div>

          <div className="glass-elevated px-4 py-1.5 rounded-full border-yellow-500/20 flex items-center gap-2">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-black text-white">{score}</span>
          </div>
        </div>
      </div>

      {mode === 'blitz' && (
        <div className="w-full h-1 bg-white/5 rounded-full mb-8 overflow-hidden">
          <motion.div 
            className="h-full bg-red-500"
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / 60) * 100}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
      )}

      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={16} className="text-yellow-400" />
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">{mode} master</span>
          </div>
          
          <motion.div 
            key={currentQ?.id || 'loading'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="min-h-[200px] flex items-center justify-center"
          >
            {!currentQ ? (
              <div className="animate-pulse text-slate-500">Loading...</div>
            ) : mode === 'reverse' ? (
              <h2 className="text-5xl font-black text-white">{currentQ.french}</h2>
            ) : (
              <div className="text-9xl">{currentQ.emojis}</div>
            )}
          </motion.div>
          
          <h2 className="text-xl font-bold text-slate-400">
            {mode === 'reverse' ? 'Choose the correct emoji' : 'What is this in French?'}
          </h2>
        </div>

        {mode === 'typing' && currentQ ? (
          <form onSubmit={handleTypingSubmit} className="space-y-4">
            <input 
              autoFocus
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={!!showFeedback}
              placeholder="Type your answer..."
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-6 text-2xl font-bold text-white text-center focus:border-purple-500 outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={!!showFeedback || !userInput}
              className="w-full py-4 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-500 transition-all disabled:opacity-50"
            >
              SUBMIT ANSWER
            </button>
          </form>
        ) : currentQ ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(mode === 'reverse' ? currentQ.options.map(opt => EMOJI_QUESTIONS.find(q => q.french === opt)?.emojis || '❓') : currentQ.options).map((option, i) => {
              const displayOption = option;
              const isSelected = selectedOption === displayOption;
              const isCorrect = mode === 'reverse' 
                ? displayOption === currentQ.emojis 
                : displayOption === currentQ.french;
              
              let statusClasses = "border-white/10 hover:border-white/20 hover:bg-white/5";
              if (showFeedback) {
                if (isCorrect) statusClasses = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400";
                else if (isSelected) statusClasses = "border-red-500/50 bg-red-500/10 text-red-400";
                else statusClasses = "opacity-40 border-white/5";
              }

              return (
                <motion.button
                  key={i}
                  onClick={() => handleOptionClick(displayOption)}
                  className={`glass-elevated p-6 rounded-2xl text-lg font-bold transition-all text-center relative overflow-hidden ${statusClasses}`}
                  whileHover={!showFeedback ? { y: -2, scale: 1.02 } : {}}
                  whileTap={!showFeedback ? { scale: 0.98 } : {}}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span className={mode === 'reverse' ? "text-4xl" : ""}>{displayOption}</span>
                  {showFeedback && isCorrect && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"
                    >
                      <CheckCircle2 size={20} />
                    </motion.div>
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"
                    >
                      <XCircle size={20} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-12 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl font-black text-xl shadow-2xl z-50 ${
              showFeedback === 'correct' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {showFeedback === 'correct' ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 />
                {streak > 5 ? `${streak} COMBO!` : 'EXCELLENT!'}
              </div>
            ) : 'OUPS!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
