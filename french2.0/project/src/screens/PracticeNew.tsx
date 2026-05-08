import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ChevronRight, Lightbulb, BookOpen, Volume2, RotateCcw, CheckCircle, XCircle, Shuffle, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TOPICS, SAMPLE_QUESTIONS } from '../data/gameData';
import { SessionCompletion } from '../components/SessionCompletion';
import { TopContextBar } from '../components/TopContextBar';
import type { Topic, Question } from '../types';

type PracticeState = 'select' | 'ready' | 'recording' | 'feedback' | 'completion';

const MOCK_FEEDBACK = {
  scores: { communication: 7.5, language: 8, fluency: 7, overall: 7.5 },
  grammar: {
    critical: [
      { theme: 'ELISION', severity: 'major' as const, msg: 'Elision required before vowel.', diagnostic: "You wrote 'je ai' but should use 'j\'ai'", correction: "j'ai" },
    ],
    polish: [
      { theme: 'CONNECTORS', severity: 'minor' as const, msg: 'Use more varied connectors.', diagnostic: "Try 'De plus,' instead of 'Et'", correction: 'De plus,' },
    ],
  },
  vocabulary: [
    { basic: 'bien', upgrade: 'formidable, exceptionnel' },
    { basic: 'beaucoup', upgrade: 'énormément, considérablement' },
  ],
  style: [{ label: 'Cleft Sentence', suggestion: 'Ce qui est important, c\'est que...' }],
  fillers: [{ word: 'euh', count: 2 }],
  wordCount: 78,
  cefrLevel: 'B1',
};

export function PracticeNew() {
  const { dispatch } = useApp();
  const [practiceState, setPracticeState] = useState<PracticeState>('select');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(Array(32).fill(4));
  const timerRef = useRef<number | null>(null);
  const waveRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) cancelAnimationFrame(waveRef.current);
    };
  }, []);

  const selectTopicAndQuestion = (topic: Topic) => {
    setSelectedTopic(topic);
    const topicQuestions = SAMPLE_QUESTIONS.filter(q => q.topicKey === topic.key);
    const q = topicQuestions.length > 0 ? topicQuestions[0] : SAMPLE_QUESTIONS[0];
    setCurrentQuestion(q);
    setPracticeState('ready');
    setShowHint(false);
    setShowModelAnswer(false);
    setTranscript('');
  };

  const nextQuestion = () => {
    if (!selectedTopic) return;
    const topicQuestions = SAMPLE_QUESTIONS.filter(q => q.topicKey === selectedTopic.key);
    const randomQ =
      topicQuestions[Math.floor(Math.random() * topicQuestions.length)] ??
      SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
    setCurrentQuestion(randomQ);
    setPracticeState('ready');
    setShowHint(false);
    setShowModelAnswer(false);
    setTranscript('');
    setIsRecording(false);
    setRecordingTime(0);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    animateWaveform();
    setTranscript('');
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) cancelAnimationFrame(waveRef.current);
    setWaveformData(Array(32).fill(4));
    setTranscript(
      "Mon école s'appelle... Elle est assez grande avec environ mille élèves. Les matières que j'étudie incluent les mathématiques, les sciences, et bien sûr le français."
    );
    setTimeout(() => {
      setPracticeState('feedback');
      dispatch({ type: 'ADD_XP', amount: 25, x: 60, y: 30 });
    }, 500);
  };

  const animateWaveform = () => {
    const animate = () => {
      setWaveformData(prev => prev.map(() => Math.random() * 40 + 4));
      waveRef.current = requestAnimationFrame(animate);
    };
    waveRef.current = requestAnimationFrame(animate);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (practiceState === 'select') {
    return (
      <>
        <TopContextBar title="Practice Mode" subtitle="Choose a topic and start learning" onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'dashboard' })} showBack />
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-24 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-white mb-1">Select a Topic</h2>
            <p className="text-slate-400">Pick an area to focus on today</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOPICS.map(topic => (
              <button
                key={topic.key}
                onClick={() => selectTopicAndQuestion(topic)}
                className="group relative p-6 rounded-2xl bg-slate-800/60 border border-white/5 hover:border-white/15 transition-all duration-200 hover:scale-[1.02] text-left overflow-hidden hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at top left, ${topic.color}20, transparent 70%)` }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{ background: `${topic.color}20`, border: `1px solid ${topic.color}30` }}
                >
                  {topic.icon}
                </div>
                <h3 className="font-bold text-white mb-1">{topic.label}</h3>
                <p className="text-sm text-slate-400 mb-3">{topic.labelEn}</p>
                <p className="text-xs text-slate-500">{topic.questionsCount} questions</p>
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(to right, transparent, ${topic.color}, transparent)` }}
                />
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (practiceState === 'completion') {
    return (
      <SessionCompletion
        score={MOCK_FEEDBACK.scores.overall}
        xpEarned={25}
        wordCount={MOCK_FEEDBACK.wordCount}
        skillImprovement={{ name: 'Fluency', before: 78, after: 81 }}
        onNext={nextQuestion}
        onRetry={() => setPracticeState('ready')}
        suggestedNextAction="dashboard"
        message="You're crushing it! 🔥"
      />
    );
  }

  return (
    <>
      <TopContextBar
        title={selectedTopic?.label}
        subtitle={`${selectedTopic?.labelEn ?? 'Learning'}`}
        showBack
        onBack={() => setPracticeState('select')}
      />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-24">
        {/* Question Card */}
        {currentQuestion && (
          <div className="glass-card p-8 rounded-2xl mb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        currentQuestion.difficulty === 1
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : currentQuestion.difficulty === 2
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {currentQuestion.difficulty === 1 ? 'Foundation' : currentQuestion.difficulty === 2 ? 'Core' : 'Extended'}
                    </span>
                    <span className="text-xs text-slate-500">Difficulty {currentQuestion.difficulty}/3</span>
                  </div>
                  <p className="text-xl font-bold text-white leading-relaxed">{currentQuestion.text}</p>
                </div>
                <button
                  onClick={nextQuestion}
                  className="flex-shrink-0 p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                  title="Next question"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Key Vocab */}
              <div className="flex flex-wrap gap-2 mb-4">
                {currentQuestion.keyVocab.map(word => (
                  <span key={word} className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/15">
                    {word}
                  </span>
                ))}
              </div>

              {/* Hint Toggle */}
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Lightbulb size={14} />
                {showHint ? 'Hide' : 'Show'} hint
                <ChevronDown size={14} className={`transition-transform ${showHint ? 'rotate-180' : ''}`} />
              </button>
              {showHint && (
                <div className="mt-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
                  💡 {currentQuestion.hint}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording Area */}
        {(practiceState === 'ready' || practiceState === 'recording') && (
          <div className="glass-card p-8 rounded-2xl mb-4">
            {/* Waveform */}
            <div className="flex items-end justify-center gap-1 h-16 mb-6">
              {waveformData.map((h, i) => (
                <div
                  key={i}
                  className="w-2 rounded-full transition-all duration-75"
                  style={{
                    height: `${h}px`,
                    background: isRecording ? `hsl(${200 + i * 2}, 80%, 60%)` : 'rgba(255,255,255,0.1)',
                    boxShadow: isRecording ? `0 0 4px hsl(${200 + i * 2}, 80%, 60%)` : 'none',
                  }}
                />
              ))}
            </div>

            {isRecording && (
              <div className="text-center mb-4">
                <span className="text-4xl font-black text-white tabular-nums">{formatTime(recordingTime)}</span>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-slate-400">Recording...</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-400 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-110'
                } active:scale-95`}
              >
                {isRecording ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
                {isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />}
              </button>
            </div>

            <p className="text-center text-sm text-slate-400 mt-4">
              {isRecording ? 'Click to stop recording' : 'Click to start recording — speak in French!'}
            </p>
          </div>
        )}

        {/* Feedback */}
        {practiceState === 'feedback' && (
          <FeedbackPanel
            transcript={transcript}
            onNext={() => setPracticeState('completion')}
            onRetry={() => {
              setPracticeState('ready');
              setTranscript('');
            }}
            showModelAnswer={showModelAnswer}
            onToggleModelAnswer={() => setShowModelAnswer(!showModelAnswer)}
            currentQuestion={currentQuestion}
          />
        )}
      </div>
    </>
  );
}

function FeedbackPanel({
  transcript,
  onNext,
  onRetry,
  showModelAnswer,
  onToggleModelAnswer,
  currentQuestion,
}: {
  transcript: string;
  onNext: () => void;
  onRetry: () => void;
  showModelAnswer: boolean;
  onToggleModelAnswer: () => void;
  currentQuestion: Question | null;
}) {
  const scores = MOCK_FEEDBACK.scores;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Score Overview */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white">Session Result</h3>
          <span className="text-xs text-slate-400">{MOCK_FEEDBACK.wordCount} words • {MOCK_FEEDBACK.cefrLevel}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries({ Communication: scores.communication, Language: scores.language, Fluency: scores.fluency, Overall: scores.overall }).map(
            ([label, val]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black mb-1" style={{ color: val >= 8 ? '#10b981' : val >= 6 ? '#f59e0b' : '#ef4444' }}>
                  {val.toFixed(1)}
                </div>
                <div className="text-xs text-slate-400">{label}</div>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(val / 10) * 100}%`, background: val >= 8 ? '#10b981' : val >= 6 ? '#f59e0b' : '#ef4444' }}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="glass-card p-5 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Your Answer</p>
          <p className="text-sm text-slate-200 leading-relaxed italic">{transcript}</p>
        </div>
      )}

      {/* Grammar Feedback */}
      {MOCK_FEEDBACK.grammar.critical.length > 0 && (
        <div className="glass-card p-5 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Corrections</p>
          <div className="space-y-3">
            {MOCK_FEEDBACK.grammar.critical.map((err, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300">{err.theme}</p>
                  <p className="text-xs text-slate-300 mt-1">{err.diagnostic}</p>
                  <p className="text-xs text-emerald-400 mt-1">✓ Use: {err.correction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
        >
          <RotateCcw size={16} />
          Try Again
        </button>
        <button
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 btn-primary py-3 rounded-xl font-semibold text-sm"
        >
          See Results
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
