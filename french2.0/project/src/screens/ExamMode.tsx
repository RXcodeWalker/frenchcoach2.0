import { useState, useEffect, useRef } from 'react';
import { Timer, ChevronRight, Mic, MicOff, CheckCircle, AlertCircle, Trophy, ArrowLeft, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EXAM_QUESTIONS } from '../data/gameData';
import type { ExamQuestion } from '../types';

type ExamState = 'intro' | 'prep' | 'question' | 'results';

const PREP_TIME = 60;
const QUESTION_TIME = 120;

export function ExamMode() {
  const { dispatch } = useApp();
  const [examState, setExamState] = useState<ExamState>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PREP_TIME);
  const [isRecording, setIsRecording] = useState(false);
  const [answers, setAnswers] = useState<{ transcript: string; score: number; time: number }[]>([]);
  const [waveData, setWaveData] = useState<number[]>(Array(40).fill(4));
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const waveRef = useRef<number | null>(null);

  const questions = EXAM_QUESTIONS.slice(0, 5);
  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) cancelAnimationFrame(waveRef.current);
    };
  }, []);

  useEffect(() => {
    if (examState === 'prep') {
      setTimeLeft(PREP_TIME);
      timerRef.current = window.setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setExamState('question');
            setTimeLeft(QUESTION_TIME);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else if (examState === 'question') {
      setTimeLeft(QUESTION_TIME);
      timerRef.current = window.setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            handleNextQuestion();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examState, currentIndex]);

  const startExam = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setExamState('prep');
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    const t = window.setInterval(() => setRecordingTime(s => s + 1), 1000);
    timerRef.current = t;
    const animate = () => {
      setWaveData(Array(40).fill(0).map(() => Math.random() * 45 + 5));
      waveRef.current = requestAnimationFrame(animate);
    };
    waveRef.current = requestAnimationFrame(animate);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) cancelAnimationFrame(waveRef.current);
    setWaveData(Array(40).fill(4));
  };

  const handleNextQuestion = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) cancelAnimationFrame(waveRef.current);
    setIsRecording(false);

    const newAnswer = {
      transcript: "J'ai répondu à cette question en français...",
      score: Math.round((Math.random() * 4 + 5) * 10) / 10,
      time: recordingTime,
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentIndex + 1 >= totalQuestions) {
      setExamState('results');
      dispatch({ type: 'ADD_XP', amount: 60, x: 70, y: 20 });
    } else {
      setCurrentIndex(i => i + 1);
      setExamState('prep');
      setRecordingTime(0);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const timerPercent = examState === 'prep' ? (timeLeft / PREP_TIME) * 100 : (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft > 30 ? '#10b981' : timeLeft > 10 ? '#f59e0b' : '#ef4444';

  if (examState === 'intro') {
    return <ExamIntro onStart={startExam} />;
  }

  if (examState === 'results') {
    const avgScore = answers.reduce((s, a) => s + a.score, 0) / answers.length;
    return <ExamResults answers={answers} questions={questions} avgScore={avgScore} onRetake={() => setExamState('intro')} />;
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-40">
      {/* Exam Header Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-slate-900/80 backdrop-blur-sm">
        <button
          onClick={() => { dispatch({ type: 'SET_SCREEN', screen: 'dashboard' }); setExamState('intro'); }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Exit Exam
        </button>

        <div className="flex items-center gap-3">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-8 h-2 rounded-full transition-all duration-500 ${
                i < currentIndex ? 'bg-emerald-500' :
                i === currentIndex ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <span className="text-sm text-slate-400 font-medium">
          Question {currentIndex + 1}/{totalQuestions}
        </span>
      </div>

      {/* Main Exam Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-3xl mx-auto w-full">
        {/* Timer */}
        <div className="relative mb-10">
          <svg width={120} height={120} className="-rotate-90">
            <circle cx={60} cy={60} r={52} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
            <circle
              cx={60} cy={60} r={52}
              fill="none"
              stroke={timerColor}
              strokeWidth={8}
              strokeDasharray={326.7}
              strokeDashoffset={326.7 - (timerPercent / 100) * 326.7}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s', filter: `drop-shadow(0 0 8px ${timerColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white tabular-nums">{formatTime(timeLeft)}</span>
            <span className="text-xs text-slate-400 mt-0.5">{examState === 'prep' ? 'Prep Time' : 'Speaking'}</span>
          </div>
        </div>

        {/* State Label */}
        <div className={`mb-6 px-5 py-2 rounded-full text-sm font-bold border ${
          examState === 'prep'
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
            : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
        }`}>
          {examState === 'prep' ? '📋 Preparation Time — Read your question' : '🎤 Now Speaking'}
        </div>

        {/* Question */}
        <div className="w-full glass-card p-8 rounded-2xl mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question {currentIndex + 1}</span>
          </div>
          <p className="text-2xl font-bold text-white leading-relaxed">{currentQ?.text}</p>
          {currentQ?.keyVocab && (
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {currentQ.keyVocab.map(word => (
                <span key={word} className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/15">
                  {word}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Waveform + Recording (shown only in question state) */}
        {examState === 'question' && (
          <div className="w-full space-y-6">
            {/* Waveform */}
            <div className="flex items-end justify-center gap-1 h-16">
              {waveData.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    height: `${h}px`,
                    background: isRecording ? `hsl(${200 + i * 2}, 80%, 60%)` : 'rgba(255,255,255,0.08)',
                    boxShadow: isRecording ? `0 0 3px hsl(${200 + i * 2}, 80%, 60%)` : 'none',
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-110'
                } active:scale-95`}
              >
                {isRecording ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
                {isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-25" />}
              </button>

              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm rounded-xl transition-all duration-200 hover:scale-[1.02]"
              >
                {currentIndex + 1 >= totalQuestions ? 'Submit Exam' : 'Next Question'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {examState === 'prep' && (
          <p className="text-sm text-slate-400 text-center">
            Read the question carefully. When the timer ends, recording begins automatically.
          </p>
        )}
      </div>
    </div>
  );
}

function ExamIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="glass-card p-8 rounded-2xl mb-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-4xl mx-auto mb-6">
          🎓
        </div>
        <h2 className="text-2xl font-black text-white mb-3">IGCSE Exam Simulation</h2>
        <p className="text-slate-400 leading-relaxed mb-6">
          Experience a full IGCSE French oral exam. You'll have preparation time, then speak your answer for each question. All sections are timed.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
            <p className="text-2xl font-black text-amber-400">5</p>
            <p className="text-xs text-slate-400 mt-1">Questions</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
            <p className="text-2xl font-black text-blue-400">1:00</p>
            <p className="text-xs text-slate-400 mt-1">Prep per Q</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
            <p className="text-2xl font-black text-emerald-400">2:00</p>
            <p className="text-xs text-slate-400 mt-1">Speaking per Q</p>
          </div>
        </div>
        <button
          onClick={onStart}
          className="flex items-center gap-3 mx-auto btn-primary px-8 py-4 rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(59,130,246,0.3)]"
        >
          <Play size={20} />
          Begin Exam
        </button>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">How You're Scored</h3>
        <div className="space-y-3">
          {[
            { label: 'Communication', desc: 'How clearly you convey your ideas', weight: '40%' },
            { label: 'Language', desc: 'Grammar accuracy and vocabulary range', weight: '40%' },
            { label: 'Fluency', desc: 'Pacing, confidence, and natural flow', weight: '20%' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/40">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
              <span className="text-sm font-bold text-blue-400">{item.weight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExamResults({
  answers,
  questions,
  avgScore,
  onRetake,
}: {
  answers: { transcript: string; score: number; time: number }[];
  questions: ExamQuestion[];
  avgScore: number;
  onRetake: () => void;
}) {
  const band = avgScore >= 8 ? 'Band 1 — Excellent' : avgScore >= 6 ? 'Band 2 — Good' : 'Band 3 — Developing';
  const bandColor = avgScore >= 8 ? '#10b981' : avgScore >= 6 ? '#f59e0b' : '#ef4444';

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6 animate-fade-in">
      {/* Result Hero */}
      <div className="glass-card p-8 rounded-2xl text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        <div className="relative">
          <Trophy size={48} className="mx-auto text-amber-400 mb-4" style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.5))' }} />
          <h2 className="text-3xl font-black text-white mb-2">Exam Complete!</h2>
          <p className="font-bold text-xl mb-1" style={{ color: bandColor }}>{band}</p>
          <p className="text-slate-400 text-sm mb-6">Average score across all questions</p>
          <div className="text-6xl font-black mb-2" style={{ color: bandColor }}>
            {avgScore.toFixed(1)}
          </div>
          <p className="text-slate-400 text-sm">out of 10.0</p>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-white mb-4">Question Breakdown</h3>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const ans = answers[i];
            if (!ans) return null;
            const color = ans.score >= 8 ? '#10b981' : ans.score >= 6 ? '#f59e0b' : '#ef4444';
            return (
              <div key={q.id} className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Question {i + 1}</p>
                    <p className="text-sm text-white font-medium">{q.text}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-black" style={{ color }}>{ans.score.toFixed(1)}</p>
                    <p className="text-xs text-slate-500">{ans.time}s</p>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(ans.score / 10) * 100}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onRetake} className="flex-1 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-sm transition-all duration-200">
          Retake Exam
        </button>
        <button className="flex-1 btn-primary py-3 rounded-xl font-semibold text-sm">
          Review Mistakes
        </button>
      </div>
    </div>
  );
}
