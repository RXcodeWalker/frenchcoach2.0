import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Mic, MicOff, Play, ArrowLeft, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EXAM_QUESTIONS } from '../data/gameData';

type ExamState = 'intro' | 'prep' | 'question' | 'results';

const PREP_TIME = 60;
const QUESTION_TIME = 120;

export function ExamMode() {
  const { dispatch } = useApp();
  const [examState, setExamState] = useState<ExamState>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PREP_TIME);
  const [isRecording, setIsRecording] = useState(false);
  const [answers, setAnswers] = useState<{ score: number; time: number }[]>([]);
  const [waveData, setWaveData] = useState<number[]>(Array(40).fill(4));
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const waveRef = useRef<number | null>(null);

  const questions = EXAM_QUESTIONS.slice(0, 5);
  const currentQ = questions[currentIndex];

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
          if (t <= 1) { clearInterval(timerRef.current!); setExamState('question'); setTimeLeft(QUESTION_TIME); return 0; }
          return t - 1;
        });
      }, 1000);
    } else if (examState === 'question') {
      setTimeLeft(QUESTION_TIME);
      timerRef.current = window.setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); handleNextQuestion(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examState, currentIndex]);

  const startExam = () => { setCurrentIndex(0); setAnswers([]); setExamState('prep'); };

  const startRecording = () => {
    setIsRecording(true); setRecordingTime(0);
    const t = window.setInterval(() => setRecordingTime(s => s + 1), 1000);
    timerRef.current = t;
    const animate = () => { setWaveData(Array(40).fill(0).map(() => Math.random() * 45 + 5)); waveRef.current = requestAnimationFrame(animate); };
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
    const newAnswer = { score: Math.round((Math.random() * 4 + 5) * 10) / 10, time: recordingTime };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    if (currentIndex + 1 >= questions.length) {
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
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-slate-900/90 to-slate-950 p-8 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl mx-auto mb-5">🎓</div>
              <h2 className="text-2xl font-black text-white mb-2">IGCSE Exam Simulation</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-md mx-auto">Experience a full IGCSE French oral exam. Timed preparation and speaking phases for each question.</p>
              <div className="grid grid-cols-3 gap-3 mb-8 max-w-sm mx-auto">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5"><p className="text-xl font-black text-amber-400">5</p><p className="text-[10px] text-slate-500">Questions</p></div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5"><p className="text-xl font-black text-blue-400">1:00</p><p className="text-[10px] text-slate-500">Prep/Q</p></div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5"><p className="text-xl font-black text-emerald-400">2:00</p><p className="text-[10px] text-slate-500">Speak/Q</p></div>
              </div>
              <button onClick={startExam} className="btn-primary px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-2 mx-auto"><Play size={16} /> Begin Exam</button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">Scoring Criteria</h3>
            <div className="space-y-2">
              {[{ label: 'Communication', desc: 'How clearly you convey ideas', weight: '40%' }, { label: 'Language', desc: 'Grammar accuracy and vocabulary', weight: '40%' }, { label: 'Fluency', desc: 'Pacing, confidence, flow', weight: '20%' }].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30">
                  <div className="flex-1"><p className="text-xs font-semibold text-white">{item.label}</p><p className="text-[10px] text-slate-500">{item.desc}</p></div>
                  <span className="text-xs font-bold text-blue-400">{item.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (examState === 'results') {
    const avgScore = answers.reduce((s, a) => s + a.score, 0) / answers.length;
    const band = avgScore >= 8 ? 'Band 1 — Excellent' : avgScore >= 6 ? 'Band 2 — Good' : 'Band 3 — Developing';
    const bandColor = avgScore >= 8 ? '#10b981' : avgScore >= 6 ? '#f59e0b' : '#ef4444';
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6 animate-fade-in">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-slate-900 p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
            <div className="relative">
              <Trophy size={40} className="mx-auto text-amber-400 mb-4" style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.4))' }} />
              <h2 className="text-2xl font-black text-white mb-1">Exam Complete</h2>
              <p className="font-bold text-sm mb-4" style={{ color: bandColor }}>{band}</p>
              <div className="text-5xl font-black mb-1" style={{ color: bandColor }}>{avgScore.toFixed(1)}</div>
              <p className="text-xs text-slate-500 mb-6">out of 10.0</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5">
            <h3 className="font-bold text-white text-xs mb-4">Question Breakdown</h3>
            <div className="space-y-2">
              {questions.map((q, i) => {
                const ans = answers[i]; if (!ans) return null;
                const c = ans.score >= 8 ? '#10b981' : ans.score >= 6 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={q.id} className="p-3 rounded-xl bg-slate-800/30 border border-white/[0.04]">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0"><p className="text-[10px] text-slate-600">Q{i + 1}</p><p className="text-xs text-white font-medium truncate">{q.text}</p></div>
                      <div className="text-right flex-shrink-0"><p className="text-lg font-black" style={{ color: c }}>{ans.score.toFixed(1)}</p><p className="text-[10px] text-slate-600">{ans.time}s</p></div>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(ans.score / 10) * 100}%`, background: c }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setExamState('intro')} className="flex-1 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-xs transition-all">Retake</button>
            <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })} className="flex-1 btn-primary py-3 rounded-xl font-semibold text-xs">Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-40">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-slate-900/80 backdrop-blur-sm">
        <button onClick={() => { dispatch({ type: 'SET_SCREEN', screen: 'home' }); setExamState('intro'); }} className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors text-xs"><ArrowLeft size={14} /> Exit</button>
        <div className="flex items-center gap-2">{questions.map((_, i) => (<div key={i} className={`w-6 h-1.5 rounded-full transition-all duration-500 ${i < currentIndex ? 'bg-emerald-500' : i === currentIndex ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`} />))}</div>
        <span className="text-xs text-slate-500 font-medium">Q{currentIndex + 1}/{questions.length}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-2xl mx-auto w-full">
        <div className="relative mb-8">
          <svg width={100} height={100} className="-rotate-90">
            <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={6} />
            <circle cx={50} cy={50} r={42} fill="none" stroke={timerColor} strokeWidth={6} strokeDasharray={263.9} strokeDashoffset={263.9 - (timerPercent / 100) * 263.9} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s', filter: `drop-shadow(0 0 6px ${timerColor})` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white tabular-nums">{formatTime(timeLeft)}</span>
            <span className="text-[10px] text-slate-500">{examState === 'prep' ? 'Prep' : 'Speaking'}</span>
          </div>
        </div>
        <div className={`mb-5 px-4 py-1.5 rounded-full text-[10px] font-bold border ${examState === 'prep' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{examState === 'prep' ? 'Preparation Time' : 'Now Speaking'}</div>
        <div className="w-full rounded-2xl border border-white/[0.06] bg-slate-900/70 p-6 mb-6 text-center">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Question {currentIndex + 1}</p>
          <p className="text-lg font-bold text-white leading-relaxed">{currentQ?.text}</p>
          {currentQ?.keyVocab && (<div className="flex flex-wrap justify-center gap-1.5 mt-4">{currentQ.keyVocab.map(word => (<span key={word} className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/15">{word}</span>))}</div>)}
        </div>
        {examState === 'question' && (
          <div className="w-full space-y-5">
            <div className="flex items-end justify-center gap-1 h-14">{waveData.map((h, i) => (<div key={i} className="w-1 rounded-full transition-all duration-75" style={{ height: `${h}px`, background: isRecording ? `hsl(${200 + i * 2}, 80%, 60%)` : 'rgba(255,255,255,0.04)', boxShadow: isRecording ? `0 0 2px hsl(${200 + i * 2}, 80%, 60%)` : 'none' }} />))}</div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={isRecording ? stopRecording : startRecording} className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${isRecording ? 'bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)] scale-110' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.3)] hover:scale-110'} active:scale-95`}>
                {isRecording ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
                {isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20" />}
              </button>
              <button onClick={handleNextQuestion} className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-all">{currentIndex + 1 >= questions.length ? 'Submit' : 'Next'} <ChevronRight size={12} /></button>
            </div>
          </div>
        )}
        {examState === 'prep' && <p className="text-xs text-slate-500 text-center">Read the question carefully. Recording begins when the timer ends.</p>}
      </div>
    </div>
  );
}
