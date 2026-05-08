import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
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
    const animate = () => { setWaveData(Array(40).fill(0).map(() => Math.random() * 44 + 5)); waveRef.current = requestAnimationFrame(animate); };
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
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 }, colors: ['#7C3AED', '#818CF8', '#10B981', '#F59E0B', '#EF4444'] });
    } else {
      setCurrentIndex(i => i + 1);
      setExamState('prep');
      setRecordingTime(0);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const timerPercent = examState === 'prep' ? (timeLeft / PREP_TIME) * 100 : (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft > 30 ? '#10B981' : timeLeft > 10 ? '#F59E0B' : '#EF4444';

  // Intro
  if (examState === 'intro') {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <motion.div
          className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative overflow-hidden rounded-2xl glass-elevated border-amber-500/15 p-8 text-center">
            <div className="absolute top-0 right-0 w-56 h-56 bg-amber-500/4 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <motion.div
                className="w-14 h-14 rounded-xl bg-amber-500/8 border border-amber-500/15 flex items-center justify-center text-2xl mx-auto mb-5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                🎓
              </motion.div>
              <h2 className="text-2xl font-black text-white mb-2">IGCSE Exam Simulation</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-md mx-auto">Experience a full IGCSE French oral exam. Timed preparation and speaking phases for each question.</p>
              <div className="grid grid-cols-3 gap-2 mb-7 max-w-sm mx-auto">
                {[
                  { value: '5', label: 'Questions', color: 'text-amber-400' },
                  { value: '1:00', label: 'Prep/Q', color: 'text-violet-400' },
                  { value: '2:00', label: 'Speak/Q', color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="p-2.5 rounded-xl glass-subtle">
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>
              <motion.button
                onClick={startExam}
                className="btn-primary px-7 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Play size={15} /> Begin Exam
              </motion.button>
            </div>
          </div>

          <div className="rounded-xl glass p-5">
            <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-3">Scoring Criteria</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Communication', desc: 'How clearly you convey ideas', weight: '40%' },
                { label: 'Language', desc: 'Grammar accuracy and vocabulary', weight: '40%' },
                { label: 'Fluency', desc: 'Pacing, confidence, flow', weight: '20%' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg glass-subtle">
                  <div className="flex-1"><p className="text-[10px] font-semibold text-white">{item.label}</p><p className="text-[9px] text-slate-600">{item.desc}</p></div>
                  <span className="text-[10px] font-bold text-violet-400">{item.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Results
  if (examState === 'results') {
    const avgScore = answers.reduce((s, a) => s + a.score, 0) / answers.length;
    const band = avgScore >= 8 ? 'Band 1 — Excellent' : avgScore >= 6 ? 'Band 2 — Good' : 'Band 3 — Developing';
    const bandColor = avgScore >= 8 ? '#10B981' : avgScore >= 6 ? '#F59E0B' : '#EF4444';
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <motion.div
          className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative overflow-hidden rounded-2xl glass-elevated border-amber-500/15 p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/3 to-transparent pointer-events-none" />
            <div className="relative">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Trophy size={36} className="mx-auto text-amber-400 mb-3" style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.4))' }} />
              </motion.div>
              <h2 className="text-2xl font-black text-white mb-1">Exam Complete</h2>
              <p className="font-bold text-sm mb-4" style={{ color: bandColor }}>{band}</p>
              <motion.div
                className="text-5xl font-black mb-1"
                style={{ color: bandColor }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                {avgScore.toFixed(1)}
              </motion.div>
              <p className="text-[10px] text-slate-600 mb-5">out of 10.0</p>
            </div>
          </div>

          <div className="rounded-xl glass p-5">
            <h3 className="font-bold text-white text-xs mb-3">Question Breakdown</h3>
            <div className="space-y-1.5">
              {questions.map((q, i) => {
                const ans = answers[i]; if (!ans) return null;
                const c = ans.score >= 8 ? '#10B981' : ans.score >= 6 ? '#F59E0B' : '#EF4444';
                return (
                  <motion.div
                    key={q.id}
                    className="p-2.5 rounded-lg glass-subtle"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-slate-700">Q{i + 1}</p>
                        <p className="text-[10px] text-white font-medium truncate">{q.text}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-black" style={{ color: c }}>{ans.score.toFixed(1)}</p>
                        <p className="text-[9px] text-slate-700">{ans.time}s</p>
                      </div>
                    </div>
                    <div className="h-1 bg-navy-300 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full shimmer-bar"
                        style={{ background: c }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(ans.score / 10) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button onClick={() => setExamState('intro')} className="flex-1 py-2.5 rounded-xl glass-subtle text-white font-semibold text-xs" whileTap={{ scale: 0.97 }}>Retake</motion.button>
            <motion.button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })} className="flex-1 btn-primary py-2.5 rounded-xl font-semibold text-xs" whileTap={{ scale: 0.97 }}>Back to Home</motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active exam (prep + question)
  return (
    <div className="fixed inset-0 bg-navy flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.03] glass">
        <motion.button
          onClick={() => { dispatch({ type: 'SET_SCREEN', screen: 'home' }); setExamState('intro'); }}
          className="flex items-center gap-1.5 text-slate-600 hover:text-white transition-colors text-[10px]"
          whileHover={{ x: -2 }}
        >
          <ArrowLeft size={12} /> Exit
        </motion.button>
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <div key={i} className={`w-5 h-1 rounded-full transition-all duration-500 ${
              i < currentIndex ? 'bg-emerald-500' : i === currentIndex ? 'bg-violet-electric shadow-[0_0_4px_rgba(124,58,237,0.5)]' : 'bg-navy-400'
            }`} />
          ))}
        </div>
        <span className="text-[10px] text-slate-600 font-medium">Q{currentIndex + 1}/{questions.length}</span>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-2xl mx-auto w-full">
        {/* Elegant Countdown Timer */}
        <div className="relative mb-6">
          <svg width={120} height={120} className="-rotate-90">
            <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={5} />
            <motion.circle
              cx={60} cy={60} r={50}
              fill="none"
              stroke={timerColor}
              strokeWidth={5}
              strokeDasharray={314.16}
              strokeLinecap="round"
              animate={{ strokeDashoffset: 314.16 - (timerPercent / 100) * 314.16 }}
              transition={{ duration: 1, ease: 'linear' }}
              style={{ filter: `drop-shadow(0 0 8px ${timerColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={timeLeft}
              className="text-3xl font-black text-white tabular-nums"
              initial={{ scale: 1.1, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {formatTime(timeLeft)}
            </motion.span>
            <span className="text-[9px] text-slate-600 mt-0.5">{examState === 'prep' ? 'Prep' : 'Speaking'}</span>
          </div>
        </div>

        {/* State Badge */}
        <motion.div
          className={`mb-4 px-3 py-1 rounded-full text-[9px] font-bold border ${
            examState === 'prep' ? 'bg-amber-500/8 text-amber-400 border-amber-500/15' : 'bg-violet-electric/8 text-violet-400 border-violet-electric/15'
          }`}
          key={examState}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {examState === 'prep' ? 'Preparation Time' : 'Now Speaking'}
        </motion.div>

        {/* Question */}
        <div className="w-full rounded-xl glass-elevated p-5 mb-5 text-center">
          <p className="text-[9px] text-slate-700 uppercase tracking-wider mb-1.5">Question {currentIndex + 1}</p>
          <p className="text-base font-bold text-white leading-relaxed">{currentQ?.text}</p>
          {currentQ?.keyVocab && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {currentQ.keyVocab.map(word => (
                <span key={word} className="text-[9px] px-1.5 py-0.5 rounded-md bg-violet-electric/8 text-violet-300 border border-violet-electric/12">{word}</span>
              ))}
            </div>
          )}
        </div>

        {/* Recording (question phase) */}
        {examState === 'question' && (
          <div className="w-full space-y-4">
            <div className="flex items-end justify-center gap-[2px] h-12">
              {waveData.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[2.5px] rounded-full"
                  animate={{
                    height: isRecording ? `${h}px` : '4px',
                    backgroundColor: isRecording
                      ? `hsl(${260 + (i / 40) * 40}, 80%, ${55 + (h / 48) * 20}%)`
                      : 'rgba(255,255,255,0.03)',
                  }}
                  transition={isRecording ? { duration: 0.08 } : { duration: 0.3 }}
                  style={{ boxShadow: isRecording ? `0 0 3px hsl(${260 + (i / 40) * 40}, 80%, 60%)` : 'none' }}
                />
              ))}
            </div>
            <div className="flex items-center justify-center gap-3">
              <motion.button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
                  isRecording
                    ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'bg-gradient-to-br from-violet-electric to-indigo-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
                {isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20" />}
              </motion.button>
              <motion.button
                onClick={handleNextQuestion}
                className="flex items-center gap-1.5 px-4 py-2 glass-subtle hover:bg-white/[0.04] text-white font-semibold text-[10px] rounded-lg transition-all"
                whileTap={{ scale: 0.95 }}
              >
                {currentIndex + 1 >= questions.length ? 'Submit' : 'Next'} <ChevronRight size={11} />
              </motion.button>
            </div>
          </div>
        )}

        {examState === 'prep' && <p className="text-[10px] text-slate-600 text-center">Read the question carefully. Recording begins when the timer ends.</p>}
      </div>
    </div>
  );
}
