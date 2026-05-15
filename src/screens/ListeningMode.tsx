import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Volume2, CheckCircle2, XCircle, ArrowRight, RotateCcw, Headphones, ChevronLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TTS } from '../services/tts/ttsService';
import { TOPICS } from '../data/gameData';
import { getRandomListeningQuestion, ListeningQuestion } from '../data/listeningQuestions';
import { TopicGrid } from './learn/TopicGrid';
import type { Topic } from '../types/index';

type ListeningState = 'topics' | 'ready' | 'playing' | 'answering' | 'feedback';

export function ListeningMode() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [state, setState] = useState<ListeningState>('topics');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ListeningQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [questionsDone, setQuestionsDone] = useState(0);

  const selectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    const q = getRandomListeningQuestion(topic.key);
    setCurrentQuestion(q);
    setState('ready');
    setScore(0);
    setQuestionsDone(0);
  };

  const startPlaying = async () => {
    if (!currentQuestion) return;
    setState('playing');
    await TTS.speak(currentQuestion.audioText);
    setState('answering');
  };

  const replayAudio = () => {
    if (!currentQuestion) return;
    TTS.speak(currentQuestion.audioText);
  };

  const checkAnswer = (answer: string) => {
    if (!currentQuestion) return;
    
    let correct = false;
    if (currentQuestion.type === 'dictation') {
      // Simple normalization for dictation
      const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;]/g, '').trim();
      correct = normalize(answer) === normalize(currentQuestion.correctAnswer);
    } else {
      correct = answer === currentQuestion.correctAnswer;
    }

    setIsCorrect(correct);
    if (correct) {
      setScore(s => s + 1);
      triggerConfetti();
      dispatch({ type: 'ADD_XP', amount: 15, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    setState('feedback');
    setQuestionsDone(d => d + 1);
  };

  const nextQuestion = () => {
    if (!selectedTopic) return;
    const q = getRandomListeningQuestion(selectedTopic.key, currentQuestion ? [currentQuestion.id] : []);
    setCurrentQuestion(q);
    setUserAnswer('');
    setIsCorrect(null);
    setState('ready');
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#EC4899', '#8B5CF6', '#3B82F6']
    });
  };

  if (state === 'topics') {
    return (
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 pt-6 -mb-8">
           <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/explore')}
              className="p-2 rounded-lg glass hover:bg-white/5 transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-400" />
            </button>
          </div>
        </div>
        <TopicGrid 
          onSelect={selectTopic} 
          title="Listening Mode" 
          subtitle="Select a topic to train your ear"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-12 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setState('topics')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors"
          >
            <ArrowRight className="rotate-180" size={16} />
            Change Topic
          </button>
          <div className="px-3 py-1 rounded-full glass text-[10px] font-bold text-slate-400">
            SCORE: {score}/{questionsDone}
          </div>
        </div>

        {/* Main Card */}
        <motion.div
          layout
          className="glass-elevated rounded-3xl p-8 md:p-12 text-center space-y-8 relative overflow-hidden"
        >
          {selectedTopic && (
            <div 
              className="absolute top-0 left-0 w-full h-1" 
              style={{ background: `linear-gradient(to right, ${selectedTopic.color}, transparent)` }}
            />
          )}

          <AnimatePresence mode="wait">
            {state === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="space-y-6"
              >
                <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-pink-500/5">
                  <Play size={32} className="text-pink-500 fill-pink-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Ready to Listen?</h2>
                  <p className="text-slate-500 mt-2">Hear a native speaker and complete the task.</p>
                </div>
                <button
                  onClick={startPlaying}
                  className="px-8 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-600/20 transition-all active:scale-95"
                >
                  Start Audio
                </button>
              </motion.div>
            )}

            {state === 'playing' && (
              <motion.div
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-pink-500 rounded-full animate-ping opacity-20" />
                    <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center relative z-10">
                      <Volume2 size={32} className="text-pink-500" />
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white animate-pulse">Listening...</h2>
              </motion.div>
            )}

            {(state === 'answering' || state === 'feedback') && currentQuestion && (
              <motion.div
                key="answering"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex justify-center gap-4">
                   <button
                    onClick={replayAudio}
                    className="p-4 rounded-2xl glass hover:bg-white/5 text-pink-500 transition-all"
                    title="Replay Audio"
                  >
                    <RotateCcw size={24} />
                  </button>
                </div>

                {currentQuestion.type === 'dictation' ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-400">Type what you heard in French:</p>
                    <textarea
                      autoFocus
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      disabled={state === 'feedback'}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all resize-none h-32"
                      placeholder="Votre réponse ici..."
                    />
                    {state === 'answering' && (
                      <button
                        onClick={() => checkAnswer(userAnswer)}
                        disabled={!userAnswer.trim()}
                        className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black disabled:opacity-50 transition-all active:scale-[0.98]"
                      >
                        Submit Answer
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-400">Choose the correct translation:</p>
                    <div className="grid gap-3">
                      {currentQuestion.options?.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => checkAnswer(option)}
                          disabled={state === 'feedback'}
                          className={`w-full p-4 rounded-2xl text-left font-medium transition-all ${
                            state === 'feedback'
                              ? option === currentQuestion.correctAnswer
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                : option === userAnswer
                                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                : 'glass opacity-50'
                              : 'glass hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {state === 'feedback' && currentQuestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-8 border-t border-white/5 space-y-6"
            >
              <div className={`flex items-center gap-3 justify-center ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                {isCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                <span className="text-xl font-black">{isCorrect ? 'Excellent!' : 'Pas tout à fait...'}</span>
              </div>

              <div className="glass rounded-2xl p-6 text-left space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correct French</p>
                  <p className="text-white font-medium">{currentQuestion.audioText}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Translation</p>
                  <p className="text-slate-400 text-sm">{currentQuestion.translationEn}</p>
                </div>
              </div>

              <button
                onClick={nextQuestion}
                className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                Next Question <ArrowRight size={18} />
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
