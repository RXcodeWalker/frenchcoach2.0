import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Info, CheckCircle2, XCircle, ArrowLeft, Trophy, Sparkles, Volume2, ChevronRight, RotateCcw, Loader2, Play, Pause, Crown } from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { useAudioBlobRecorder } from '../features/recording/useAudioBlobRecorder';
import { PRONUNCIATION_DRILLS } from '../data/pronunciationDrills';
import { Waveform } from '../features/recording/Waveform';
import { assessPronunciation } from '../services/pronunciation/pronunciationClient';
import { PronunciationSourceBadge } from './learn/PronunciationSourceBadge';
import type { PronunciationAssessment } from '../domain/pronunciation/types';

type LabResult = PronunciationAssessment & { audioUrl?: string; waveSnapshot?: number[] };

export function PronunciationLab() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { isRecording, start, stop, waveData, micLevel } = useAudioBlobRecorder();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<LabResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentDrill = PRONUNCIATION_DRILLS[currentIndex];
  const isMastered = state.masteredDrills.includes(currentDrill.id);

  const handleRecordToggle = async () => {
    if (isRecording) {
      const result = await stop();
      if (result) {
        setIsAnalyzing(true);
        setEvalError(null);
        try {
          const assessment = await assessPronunciation({
            audioBlob: result.blob,
            targetText: currentDrill.french,
            source: 'pronunciation_lab',
          });
          const feedbackWithAudio: LabResult = {
            ...assessment,
            audioUrl: result.url,
            waveSnapshot: result.waveSnapshot,
          };
          setFeedback(feedbackWithAudio);

          const pronScore = assessment.score;
          if (pronScore >= 70) {
            const xp = Math.round((pronScore / 10) * (attempts === 1 ? 2 : 1.5));
            setScore(s => s + xp);
            dispatchAddXP(dispatch, xp);
          }

          if (pronScore >= 90) {
            dispatch({ type: 'MARK_DRILL_MASTERED', drillId: currentDrill.id });
          }
        } catch (err) {
          console.error("Evaluation failed:", err);
          setEvalError(err instanceof Error ? err.message : 'Evaluation failed. Please try again.');
        } finally {
          setIsAnalyzing(false);
        }
      }
    } else {
      setFeedback(null);
      setEvalError(null);
      setAttempts(prev => prev + 1);
      start();
    }
  };

  const nextDrill = () => {
    if (currentIndex < PRONUNCIATION_DRILLS.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFeedback(null);
      setShowTip(false);
      setAttempts(0);
      setIsPlayingBack(false);
    } else {
      setCompleted(true);
    }
  };

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(currentDrill.french);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  };

  const togglePlayback = () => {
    if (!feedback?.audioUrl) return;
    if (isPlayingBack) {
      audioRef.current?.pause();
      setIsPlayingBack(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(feedback.audioUrl);
        audioRef.current.onended = () => setIsPlayingBack(false);
      }
      audioRef.current.play();
      setIsPlayingBack(true);
    }
  };

  const isSuccess = feedback && feedback.score >= 70;

  if (completed) {
    const masteredInSession = PRONUNCIATION_DRILLS.filter(d => state.masteredDrills.includes(d.id)).length;
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          className="max-w-md w-full glass-elevated p-8 text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <Trophy size={40} className="text-emerald-400" />
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter uppercase">Lab Complete</h1>
            <p className="text-slate-400 text-sm">Your accent is sounding better already! You've earned <span className="text-emerald-400 font-bold">+{score} XP</span>.</p>
            <div className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Crown size={16} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{masteredInSession} Sounds Mastered</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={() => navigate('/explore')}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all uppercase italic tracking-wider"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Back to Explore
            </motion.button>
            <button 
              onClick={() => {
                setCompleted(false);
                setCurrentIndex(0);
                setScore(0);
                setAttempts(0);
              }}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={12} />
              Restart Lab
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-12 pb-24">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/explore')}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-bold uppercase tracking-wider">Exit Lab</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
            {currentIndex + 1} / {PRONUNCIATION_DRILLS.length}
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
            {score} XP
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Column: Focus & IPA */}
        <div className="md:col-span-2 space-y-4">
          <motion.div 
            className="glass-elevated p-6 rounded-2xl border-l-4 border-l-emerald-500"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            key={`focus-${currentIndex}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Focus</span>
              </div>
              {isMastered && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  <Crown size={10} className="text-amber-400" />
                  <span className="text-[8px] font-bold text-amber-400 uppercase">Mastered</span>
                </div>
              )}
            </div>
            <h2 className="text-xl font-black text-white mb-1">{currentDrill.focus}</h2>
            <div className="flex items-center gap-2 text-emerald-400/60 font-mono text-sm">
              <span>IPA:</span>
              <span className="bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 text-emerald-400">/{currentDrill.ipa}/</span>
            </div>
          </motion.div>

          <motion.div 
            className="glass-elevated p-6 rounded-2xl"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            key={`tip-${currentIndex}`}
          >
            <button 
              onClick={() => setShowTip(!showTip)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Info size={16} className="text-blue-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Coach Tip</span>
              </div>
              <ChevronRight size={14} className={`text-slate-600 transition-transform ${showTip ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence>
              {showTip && (
                <motion.p 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-xs text-slate-400 mt-3 leading-relaxed overflow-hidden"
                >
                  {currentDrill.tip}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Right Column: Practice Area */}
        <div className="md:col-span-3">
          <motion.div 
            className="glass-elevated p-8 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center text-center min-h-[480px]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            key={`drill-${currentIndex}`}
          >
            <AnimatePresence mode="wait">
              {isAnalyzing && (
                <motion.div 
                  key="analyzing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm"
                >
                  <Loader2 size={48} className="text-emerald-400 animate-spin mb-4" />
                  <p className="text-emerald-400 font-black text-xl italic uppercase tracking-tighter">Analyzing Phonemes...</p>
                  <p className="text-slate-500 text-xs mt-2 italic">Gemini is listening to your accent...</p>
                </motion.div>
              )}

              {evalError && !isAnalyzing && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-red-500/10 text-center"
                >
                  <XCircle size={40} className="text-red-400 mb-4" />
                  <p className="text-red-400 font-black text-lg italic uppercase tracking-tighter">Evaluation Failed</p>
                  <p className="text-slate-500 text-xs mt-2 max-w-xs">{evalError}</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setEvalError(null)}
                    className="mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all uppercase text-xs tracking-wider"
                  >
                    Try Again
                    <RotateCcw size={16} />
                  </motion.button>
                </motion.div>
              )}

              {feedback && !isAnalyzing && !evalError && (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`absolute inset-0 z-10 flex flex-col p-6 overflow-y-auto ${isSuccess ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        {isSuccess ? (
                          <CheckCircle2 size={32} className="text-emerald-400" />
                        ) : (
                          <XCircle size={32} className="text-red-400" />
                        )}
                        <span className={`text-2xl font-black ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.score}/100</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Precision Score</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={speak}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition-all"
                      >
                        <Volume2 size={14} /> NATIVE
                      </button>
                      <button
                        onClick={togglePlayback}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${isPlayingBack ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                      >
                        {isPlayingBack ? <Pause size={14} /> : <Play size={14} />} YOU
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <PronunciationSourceBadge provider={feedback.provider} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest block text-center">Your Rhythm</span>
                      <div className="h-16 flex items-center justify-center bg-black/20 rounded-xl overflow-hidden px-2">
                        {feedback.waveSnapshot && <Waveform data={feedback.waveSnapshot} isRecording={false} />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest block text-center">Native Target</span>
                      <div className="h-16 flex items-center justify-center bg-black/20 rounded-xl overflow-hidden px-2 opacity-30">
                        <Waveform data={Array(40).fill(0).map(() => Math.random() * 20 + 10)} isRecording={false} />
                      </div>
                    </div>
                  </div>

                  {feedback.issues.length > 0 ? (
                    <div className="space-y-4 text-left">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Phonetic Breakdown</h3>
                      {feedback.issues.map((issue, idx) => (
                        <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-white">{issue.word}</span>
                            <div className="flex gap-2 text-[10px] font-mono items-center">
                              {!issue.ipaExpected && <span className="text-[8px] text-slate-600 uppercase tracking-widest">heard</span>}
                              <span className="text-slate-500">
                                {issue.ipaExpected ? `/${issue.ipaExpected}/` : (issue.expected ?? issue.word)}
                              </span>
                              <ChevronRight size={10} className="text-slate-700" />
                              <span className="text-red-400">
                                {issue.ipaHeard ? `/${issue.ipaHeard}/` : (issue.heard ?? '?')}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed italic">"{issue.problem}"</p>
                        </div>
                      ))}
                    </div>
                  ) : isSuccess && (
                    <div className="mt-4 flex flex-col items-center">
                      <p className="text-emerald-400 font-black text-xl italic uppercase tracking-tighter">Excellent Native Flow!</p>
                      <p className="text-slate-500 text-xs mt-2 italic">No phonetic issues detected.</p>
                    </div>
                  )}

                  {feedback.issues.length > 0 && (
                    <div className="mt-6 text-left">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-3">AI Recommendations</h3>
                      <ul className="space-y-2">
                        {feedback.issues.map((issue, idx) => (
                          <li key={idx} className="flex gap-2 text-[11px] text-slate-300">
                            <span className="text-emerald-500">•</span>
                            <span>{issue.problem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto pt-8">
                    {isSuccess ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={nextDrill}
                        className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-950 font-black rounded-2xl transition-all uppercase italic tracking-wider shadow-lg"
                      >
                        Next Sound
                        <ChevronRight size={20} />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFeedback(null)}
                        className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-red-500 text-white font-black rounded-2xl transition-all uppercase italic tracking-wider shadow-lg"
                      >
                        Try Again
                        <RotateCcw size={18} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6 w-full">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mb-4 block">Repeat this word</span>
                <div className="flex items-center justify-center gap-4">
                  <h1 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter leading-tight">{currentDrill.french}</h1>
                  <button 
                    onClick={speak}
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Volume2 size={24} />
                  </button>
                </div>
              </div>

              <div className="py-8 flex flex-col items-center justify-center min-h-[120px]">
                {isRecording ? (
                  <div className="space-y-4 w-full flex flex-col items-center">
                    <Waveform data={waveData} isRecording={isRecording} source={micLevel} />
                    <p className="text-emerald-400 font-bold text-xs animate-pulse">Capturing Audio...</p>
                  </div>
                ) : !feedback && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRecordToggle}
                    className="w-24 h-24 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-slate-950 transition-all"
                  >
                    <Mic size={40} />
                  </motion.button>
                )}
              </div>

              {!isRecording && !feedback && (
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Tap the mic to start</p>
              )}
              
              {isRecording && (
                <button 
                  onClick={handleRecordToggle}
                  className="flex items-center gap-2 px-6 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all"
                >
                  <MicOff size={12} />
                  Stop & Analyze
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
