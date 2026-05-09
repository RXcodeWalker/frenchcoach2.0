import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ChevronRight, Lightbulb, ChevronDown, Circle as XCircle, RotateCcw, CircleCheck as CheckCircle } from 'lucide-react';
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

export function Learn() {
  const { dispatch } = useApp();
  const [learnState, setLearnState] = useState<LearnState>('topics');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveData, setWaveData] = useState<number[]>(Array(32).fill(4));
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
      setWaveData(prev => prev.map(() => Math.random() * 40 + 4));
      waveRef.current = requestAnimationFrame(animate);
    };
    waveRef.current = requestAnimationFrame(animate);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) cancelAnimationFrame(waveRef.current);
    setWaveData(Array(32).fill(4));
    setTimeout(() => {
      setLearnState('feedback');
      dispatch({ type: 'ADD_XP', amount: 25, x: 60, y: 30 });
    }, 500);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (learnState === 'topics') {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Learn</h1>
            <p className="text-sm text-slate-500 mt-1">Choose a topic and start practicing</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TOPICS.map(topic => (
              <button
                key={topic.key}
                onClick={() => selectTopic(topic)}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5 text-left hover:border-white/15 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at top left, ${topic.color}15, transparent 70%)` }}
                />
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                    style={{ background: `${topic.color}15`, border: `1px solid ${topic.color}25` }}
                  >
                    {topic.icon}
                  </div>
                  <h3 className="font-bold text-white text-sm mb-0.5">{topic.label}</h3>
                  <p className="text-xs text-slate-500">{topic.labelEn}</p>
                  <p className="text-[10px] text-slate-600 mt-2">{topic.questionsCount} questions</p>
                </div>
              </button>
            ))}
          </div>

          {/* Random Question */}
          <button
            onClick={() => {
              const t = TOPICS[Math.floor(Math.random() * TOPICS.length)];
              selectTopic(t);
            }}
            className="w-full group relative overflow-hidden rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-5 text-left hover:border-white/20 hover:bg-slate-900/50 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <span className="text-lg">🎲</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">Random Question</p>
                <p className="text-xs text-slate-500">Get a random question from any topic</p>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (learnState === 'complete') {
    const scores = MOCK_FEEDBACK.scores;
    const color = scores.overall >= 8 ? '#10b981' : scores.overall >= 6 ? '#f59e0b' : '#ef4444';
    return (
      <div className="min-h-screen pb-24 md:pb-8 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 w-full">
          <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-800 to-slate-900 p-8 text-center shadow-[0_0_60px_rgba(59,130,246,0.15)]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="text-5xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-black text-white mb-2">Session Complete</h2>
              <p className="text-slate-400 text-sm mb-6">You're crushing it!</p>

              <div className="text-6xl font-black mb-1" style={{ color }}>{scores.overall.toFixed(1)}</div>
              <p className="text-xs text-slate-500 mb-6">out of 10.0</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                  <p className="text-lg font-black text-emerald-400">+25</p>
                  <p className="text-[10px] text-slate-500">XP</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                  <p className="text-lg font-black text-blue-400">78</p>
                  <p className="text-[10px] text-slate-500">Words</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                  <p className="text-lg font-black text-amber-400">B1</p>
                  <p className="text-[10px] text-slate-500">CEFR</p>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={nextQuestion} className="w-full btn-primary py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { setLearnState('question'); }} className="flex-1 py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1">
                    <RotateCcw size={12} /> Retry
                  </button>
                  <button onClick={() => setLearnState('topics')} className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white font-semibold text-xs transition-all">
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setLearnState('topics')} className="text-sm text-slate-500 hover:text-white transition-colors">
            ← Back
          </button>
          {selectedTopic && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: `${selectedTopic.color}15`, color: selectedTopic.color, border: `1px solid ${selectedTopic.color}25` }}>
              <span>{selectedTopic.icon}</span> {selectedTopic.label}
            </div>
          )}
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/70 p-6 md:p-8">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  currentQuestion.difficulty === 1 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                  currentQuestion.difficulty === 2 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                  'bg-red-500/15 text-red-400 border border-red-500/20'
                }`}>
                  {currentQuestion.difficulty === 1 ? 'Foundation' : currentQuestion.difficulty === 2 ? 'Core' : 'Extended'}
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white leading-relaxed mb-4">{currentQuestion.text}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {currentQuestion.keyVocab.map(word => (
                  <span key={word} className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/15 font-medium">{word}</span>
                ))}
              </div>

              <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                <Lightbulb size={12} />
                {showHint ? 'Hide' : 'Show'} hint
                <ChevronDown size={12} className={`transition-transform ${showHint ? 'rotate-180' : ''}`} />
              </button>
              {showHint && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/15 text-xs text-amber-200">
                  {currentQuestion.hint}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording Area */}
        {(learnState === 'question' || learnState === 'recording') && (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/70 p-6 md:p-8">
            {/* Waveform */}
            <div className="flex items-end justify-center gap-1 h-16 mb-6">
              {waveData.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    height: `${h}px`,
                    background: isRecording ? `hsl(${200 + i * 2}, 80%, 60%)` : 'rgba(255,255,255,0.06)',
                    boxShadow: isRecording ? `0 0 3px hsl(${200 + i * 2}, 80%, 60%)` : 'none',
                  }}
                />
              ))}
            </div>

            {isRecording && (
              <div className="text-center mb-4">
                <span className="text-3xl font-black text-white tabular-nums">{formatTime(recordingTime)}</span>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-400">Recording</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)] scale-110'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.3)] hover:scale-110'
                } active:scale-95`}
              >
                {isRecording ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
                {isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-25" />}
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 mt-4">
              {isRecording ? 'Tap to stop' : 'Tap to start recording'}
            </p>
          </div>
        )}

        {/* Feedback */}
        {learnState === 'feedback' && (
          <div className="space-y-3 animate-fade-in">
            {/* Scores */}
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/70 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm">Results</h3>
                <span className="text-[10px] text-slate-500">{MOCK_FEEDBACK.wordCount} words / {MOCK_FEEDBACK.cefrLevel}</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries({ Comm: MOCK_FEEDBACK.scores.communication, Lang: MOCK_FEEDBACK.scores.language, Fluency: MOCK_FEEDBACK.scores.fluency, Overall: MOCK_FEEDBACK.scores.overall }).map(([label, val]) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-black mb-1" style={{ color: val >= 8 ? '#10b981' : val >= 6 ? '#f59e0b' : '#ef4444' }}>
                      {val.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500">{label}</div>
                    <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(val / 10) * 100}%`, background: val >= 8 ? '#10b981' : val >= 6 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grammar */}
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/70 p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Corrections</p>
              {MOCK_FEEDBACK.grammar.critical.map((err, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/15 mb-2">
                  <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-300">{err.theme}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{err.diagnostic}</p>
                    <p className="text-[11px] text-emerald-400 mt-0.5"><CheckCircle size={10} className="inline mr-1" />{err.correction}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Vocabulary */}
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/70 p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Vocabulary Upgrades</p>
              {MOCK_FEEDBACK.vocabulary.map((v, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 mb-1.5">
                  <span className="text-xs text-slate-500 line-through">{v.basic}</span>
                  <ChevronRight size={10} className="text-slate-700" />
                  <span className="text-xs text-emerald-400 font-medium">{v.upgrade}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => { setLearnState('question'); }} className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-xs transition-all">
                <RotateCcw size={14} /> Retry
              </button>
              <button onClick={() => setLearnState('complete')} className="flex-1 btn-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                See Results <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
