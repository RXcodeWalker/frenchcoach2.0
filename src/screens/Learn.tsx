import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Mic, MicOff, ChevronRight, Lightbulb, ChevronDown, XCircle, RotateCcw, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TOPICS, SAMPLE_QUESTIONS } from '../data/gameData';
import type { Topic, Question } from '../types';

type LearnState = 'topics' | 'question' | 'recording' | 'feedback' | 'complete';

const MOCK_FEEDBACK = {
  scores: { communication: 7.5, language: 8, fluency: 7, overall: 7.5 },
  grammar: {
    critical: [
      { theme: 'ELISION', severity: 'major' as const, msg: 'Elision required before vowel.', diagnostic: "You wrote 'je ai' but should use 'j'ai'", correction: "j'ai" },
    ],
    polish: [
      { theme: 'CONNECTORS', severity: 'minor' as const, msg: 'Use more varied connectors.', diagnostic: "Try 'De plus,' instead of 'Et'", correction: 'De plus,' },
    ],
  },
  vocabulary: [
    { basic: 'bien', upgrade: 'formidable, exceptionnel' },
    { basic: 'beaucoup', upgrade: 'enormement, considerablement' },
  ],
  wordCount: 78,
  cefrLevel: 'B1',
};

const WAVE_BARS = 40;

export function Learn() {
  const { dispatch } = useApp();
  const [learnState, setLearnState] = useState<LearnState>('topics');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveData, setWaveData] = useState<number[]>(Array(WAVE_BARS).fill(4));
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<number | null>(null);
  const waveRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) cancelAnimationFrame(waveRef.current);
    };
  }, []);

  const selectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    const topicQs = SAMPLE_QUESTIONS.filter(q => q.topicKey === topic.key);
    setCurrentQuestion(topicQs[0] ?? SAMPLE_QUESTIONS[0]);
    setLearnState('question');
    setShowHint(false);
  };

  const nextQuestion = () => {
    if (!selectedTopic) return;
    const topicQs = SAMPLE_QUESTIONS.filter(q => q.topicKey === selectedTopic.key);
    const q = topicQs[Math.floor(Math.random() * topicQs.length)] ?? SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
    setCurrentQuestion(q);
    setLearnState('question');
    setShowHint(false);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    const animate = () => {
      setWaveData(Array(WAVE_BARS).fill(0).map(() => Math.random() * 44 + 4));
      waveRef.current = requestAnimationFrame(animate);
    };
    waveRef.current = requestAnimationFrame(animate);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) cancelAnimationFrame(waveRef.current);
    setWaveData(Array(WAVE_BARS).fill(4));
    setTimeout(() => {
      setLearnState('feedback');
      dispatch({ type: 'ADD_XP', amount: 25, x: 60, y: 30 });
    }, 500);
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#7C3AED', '#818CF8', '#10B981', '#F59E0B'] });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Topics view
  if (learnState === 'topics') {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <motion.div
          className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Learn</h1>
            <p className="text-sm text-slate-500 mt-1">Choose a topic and start practicing</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TOPICS.map((topic, idx) => (
              <motion.button
                key={topic.key}
                onClick={() => selectTopic(topic)}
                className="group relative overflow-hidden rounded-xl glass p-5 text-left hover:border-white/10 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at top left, ${topic.color}12, transparent 70%)` }}
                />
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${topic.color}18, ${topic.color}08)`,
                      border: `1px solid ${topic.color}20`,
                      boxShadow: `0 0 12px ${topic.color}10`,
                    }}
                  >
                    {topic.icon}
                  </div>
                  <h3 className="font-bold text-white text-sm mb-0.5">{topic.label}</h3>
                  <p className="text-[10px] text-slate-600">{topic.labelEn}</p>
                  <p className="text-[9px] text-slate-700 mt-2">{topic.questionsCount} questions</p>
                </div>
              </motion.button>
            ))}
          </div>

          <motion.button
            onClick={() => { const t = TOPICS[Math.floor(Math.random() * TOPICS.length)]; selectTopic(t); }}
            className="w-full group relative overflow-hidden rounded-xl glass-subtle border-dashed border-white/8 p-4 text-left hover:bg-white/[0.02] transition-all duration-300"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-electric/8 border border-violet-electric/15 flex items-center justify-center">
                <span className="text-base">🎲</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">Random Question</p>
                <p className="text-[10px] text-slate-600">Get a random question from any topic</p>
              </div>
              <ChevronRight size={14} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Complete view
  if (learnState === 'complete') {
    const scores = MOCK_FEEDBACK.scores;
    const color = scores.overall >= 8 ? '#10B981' : scores.overall >= 6 ? '#F59E0B' : '#EF4444';
    return (
      <div className="min-h-screen pb-24 md:pb-8 flex items-center justify-center">
        <motion.div
          className="max-w-md mx-auto px-4 w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="relative overflow-hidden rounded-2xl glass-elevated border-violet-electric/20 p-8 text-center">
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-electric/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <motion.div
                className="text-5xl mb-4"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-black text-white mb-1">Session Complete</h2>
              <p className="text-slate-500 text-sm mb-5">You're crushing it!</p>

              <motion.div
                className="text-5xl font-black mb-1"
                style={{ color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                {scores.overall.toFixed(1)}
              </motion.div>
              <p className="text-[10px] text-slate-600 mb-5">out of 10.0</p>

              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { value: '+25', label: 'XP', color: 'text-emerald-400' },
                  { value: '78', label: 'Words', color: 'text-violet-400' },
                  { value: 'B1', label: 'CEFR', color: 'text-amber-400' },
                ].map(stat => (
                  <div key={stat.label} className="p-2.5 rounded-xl glass-subtle">
                    <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
                    <p className="text-[9px] text-slate-600">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <motion.button
                  onClick={() => { nextQuestion(); triggerConfetti(); }}
                  className="w-full btn-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Continue <ChevronRight size={14} />
                </motion.button>
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => { setLearnState('question'); }}
                    className="flex-1 py-2.5 rounded-xl glass-subtle text-white font-semibold text-xs flex items-center justify-center gap-1"
                    whileTap={{ scale: 0.97 }}
                  >
                    <RotateCcw size={11} /> Retry
                  </motion.button>
                  <motion.button
                    onClick={() => setLearnState('topics')}
                    className="flex-1 py-2.5 rounded-xl border border-white/8 hover:border-white/15 text-slate-500 hover:text-white font-semibold text-xs transition-all"
                    whileTap={{ scale: 0.97 }}
                  >
                    Back
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Question / Recording / Feedback view
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setLearnState('topics')}
            className="text-xs text-slate-600 hover:text-white transition-colors"
            whileHover={{ x: -2 }}
          >
            ← Back
          </motion.button>
          {selectedTopic && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: `${selectedTopic.color}12`, color: selectedTopic.color, border: `1px solid ${selectedTopic.color}20` }}>
              <span>{selectedTopic.icon}</span> {selectedTopic.label}
            </div>
          )}
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              className="relative overflow-hidden rounded-xl glass-elevated p-6 md:p-7"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-violet-electric/3 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    currentQuestion.difficulty === 1 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                    currentQuestion.difficulty === 2 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' :
                    'bg-red-500/10 text-red-400 border border-red-500/15'
                  }`}>
                    {currentQuestion.difficulty === 1 ? 'Foundation' : currentQuestion.difficulty === 2 ? 'Core' : 'Extended'}
                  </span>
                </div>
                <p className="text-lg md:text-xl font-bold text-white leading-relaxed mb-3">{currentQuestion.text}</p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {currentQuestion.keyVocab.map(word => (
                    <span key={word} className="text-[9px] px-2 py-0.5 rounded-md bg-violet-electric/8 text-violet-300 border border-violet-electric/12 font-medium">{word}</span>
                  ))}
                </div>

                <motion.button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1.5 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <Lightbulb size={11} />
                  {showHint ? 'Hide' : 'Show'} hint
                  <ChevronDown size={10} className={`transition-transform ${showHint ? 'rotate-180' : ''}`} />
                </motion.button>
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      className="mt-2.5 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/12 text-[10px] text-amber-200"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {currentQuestion.hint}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording Area */}
        {(learnState === 'question' || learnState === 'recording') && (
          <motion.div
            className="relative overflow-hidden rounded-xl glass p-6 md:p-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Live CSS-animated waveform */}
            <div className="flex items-end justify-center gap-[2px] h-16 mb-5">
              {waveData.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full"
                  animate={{
                    height: isRecording ? `${h}px` : '4px',
                    backgroundColor: isRecording
                      ? `hsl(${260 + (i / WAVE_BARS) * 40}, 80%, ${55 + (h / 48) * 20}%)`
                      : 'rgba(255,255,255,0.04)',
                  }}
                  transition={isRecording ? { duration: 0.08 } : { duration: 0.3 }}
                  style={{
                    boxShadow: isRecording ? `0 0 4px hsl(${260 + (i / WAVE_BARS) * 40}, 80%, 60%)` : 'none',
                  }}
                />
              ))}
            </div>

            <AnimatePresence>
              {isRecording && (
                <motion.div
                  className="text-center mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-2xl font-black text-white tabular-nums">{formatTime(recordingTime)}</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-slate-500">Recording</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center">
              <motion.button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
                  isRecording
                    ? 'bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)]'
                    : 'bg-gradient-to-br from-violet-electric to-indigo-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
                {isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20" />}
              </motion.button>
            </div>

            <p className="text-center text-[10px] text-slate-600 mt-3">
              {isRecording ? 'Tap to stop' : 'Tap to start recording'}
            </p>
          </motion.div>
        )}

        {/* Feedback */}
        <AnimatePresence>
          {learnState === 'feedback' && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Scores */}
              <div className="rounded-xl glass-elevated p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-sm">Results</h3>
                  <span className="text-[9px] text-slate-600">{MOCK_FEEDBACK.wordCount} words / {MOCK_FEEDBACK.cefrLevel}</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries({ Comm: MOCK_FEEDBACK.scores.communication, Lang: MOCK_FEEDBACK.scores.language, Fluency: MOCK_FEEDBACK.scores.fluency, Overall: MOCK_FEEDBACK.scores.overall }).map(([label, val]) => (
                    <div key={label} className="text-center">
                      <motion.div
                        className="text-xl font-black mb-1"
                        style={{ color: val >= 8 ? '#10B981' : val >= 6 ? '#F59E0B' : '#EF4444' }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      >
                        {val.toFixed(1)}
                      </motion.div>
                      <div className="text-[9px] text-slate-600">{label}</div>
                      <div className="mt-1.5 h-1 bg-navy-300 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full shimmer-bar"
                          style={{ background: val >= 8 ? '#10B981' : val >= 6 ? '#F59E0B' : '#EF4444' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(val / 10) * 100}%` }}
                          transition={{ delay: 0.3, duration: 0.6 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grammar */}
              <div className="rounded-xl glass p-4">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Corrections</p>
                {MOCK_FEEDBACK.grammar.critical.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 mb-1.5">
                    <XCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-red-300">{err.theme}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{err.diagnostic}</p>
                      <p className="text-[10px] text-emerald-400 mt-0.5"><CheckCircle size={9} className="inline mr-1" />{err.correction}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vocabulary */}
              <div className="rounded-xl glass p-4">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Vocabulary Upgrades</p>
                {MOCK_FEEDBACK.vocabulary.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-subtle mb-1">
                    <span className="text-[10px] text-slate-600 line-through">{v.basic}</span>
                    <ChevronRight size={9} className="text-slate-700" />
                    <span className="text-[10px] text-emerald-400 font-medium">{v.upgrade}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <motion.button
                  onClick={() => { setLearnState('question'); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-subtle text-white font-semibold text-xs"
                  whileTap={{ scale: 0.97 }}
                >
                  <RotateCcw size={12} /> Retry
                </motion.button>
                <motion.button
                  onClick={() => { setLearnState('complete'); triggerConfetti(); }}
                  className="flex-1 btn-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  See Results <ChevronRight size={13} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
