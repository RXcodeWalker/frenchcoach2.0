/**
 * Accent Analyzer — the single pronunciation-practice surface (accent-analyzer
 * plan §16). Absorbs PronunciationLab's drill/XP/mastery loop; PronunciationLab.tsx
 * is deleted and /pronunciation-lab redirects here in the same change (leaving
 * both live during migration would reinstate the duplication the plan exists
 * to remove).
 *
 * No fabricated stats: the old "12 / 50 Drills Completed" / "Global Rank #42"
 * literals are gone, replaced by real counts derived from masteredDrills and
 * pronunciation history.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  ArrowLeft,
  RotateCcw,
  Info,
  Volume2,
  ChevronRight,
  Trophy,
  Target,
  Crown,
  WifiOff,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { useAudioBlobRecorder } from '../features/recording/useAudioBlobRecorder';
import { Waveform } from '../features/recording/Waveform';
import { assessPronunciation } from '../services/pronunciation/pronunciationClient';
import { AudioTooShortError } from '../domain/pronunciation/audioNormalizer';
import { PronunciationSourceBadge } from './learn/PronunciationSourceBadge';
import { PronunciationHeatMap } from '../features/feedback/components/PronunciationHeatMap';
import { PRACTICE_PASS_SCORE } from '../domain/pronunciation/practiceThresholds';
import { PRONUNCIATION_DRILLS, type PronunciationDrill } from '../data/pronunciationDrills';
import { TTS } from '../services/tts/ttsService';
import {
  appendPronunciationAttempt,
  assessmentToAttemptRecord,
  getPronunciationHistory,
  segmentHistoryForTrend,
  type PronunciationAttemptRecord,
} from '../services/pronunciation/pronunciationHistoryService';
import { pushPronunciationAttempt } from '../services/sync/pronunciationSync';
import { buildPronunciationEvidence } from '../services/coach/pronunciationEvidence';
import { appendEvidenceEvents } from '../services/coach/coachStorage';
import type { PronunciationAssessment } from '../domain/pronunciation/types';

type ScreenState =
  | 'idle'
  | 'permission-denied'
  | 'recording'
  | 'too-short'
  | 'analyzing'
  | 'results'
  | 'low-confidence'
  | 'could-not-assess'
  | 'offline-tier'
  | 'error';

const MIN_RECORDING_MS = 400; // plan §9: reject <0.4s clips client-side
// A blob this small is a container header, not 0.4s of speech in any codec —
// what a denied mic or an instantly-stopped recorder produces. Caught here at
// the recording boundary rather than in the normalizer, whose contract is to
// decode whatever it is handed. Without it the clip reaches decodeAudioData as
// a bare "EncodingError: Unable to decode audio data", degrades to uploading
// the raw blob, and burns a backend round-trip on unassessable audio.
const MIN_RECORDING_BYTES = 1024;
const LOW_CONFIDENCE_FLOOR = 0.4; // plan §11: below the floor, "we couldn't assess this reliably"

function makeAttemptId(): string {
  return `pron_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function speakFrench(text: string) {
  if (TTS.isSupported()) {
    void TTS.speak(text);
  } else {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }
}

export function AccentAnalyzer() {
  const navigate = useNavigate();
  const { state, dispatch, authUser } = useApp();
  const { isRecording, start, stop, waveData, micLevel } = useAudioBlobRecorder();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [assessment, setAssessment] = useState<PronunciationAssessment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<PronunciationAttemptRecord[]>([]);

  const currentDrill: PronunciationDrill = PRONUNCIATION_DRILLS[currentIndex];
  const isMastered = state.masteredDrills.includes(currentDrill.id);

  useEffect(() => {
    setHistory(getPronunciationHistory());
  }, []);

  const historySegments = useMemo(() => segmentHistoryForTrend(history), [history]);
  const masteredCount = useMemo(
    () => PRONUNCIATION_DRILLS.filter(d => state.masteredDrills.includes(d.id)).length,
    [state.masteredDrills],
  );

  const reset = () => {
    setScreenState('idle');
    setAssessment(null);
    setErrorMessage(null);
  };

  const recordAttempt = (result: PronunciationAssessment) => {
    const attemptId = makeAttemptId();
    const record = assessmentToAttemptRecord(attemptId, currentDrill.french, result);
    const next = appendPronunciationAttempt(record);
    setHistory(next);
    if (authUser) {
      void pushPronunciationAttempt(authUser.id, record);
    }

    // pron:* evidence — captured in the coach evidence log, never merged into
    // the 14 grammar categories (accent-analyzer plan Phase 5).
    const evidenceEvents = buildPronunciationEvidence({
      attemptId,
      sessionId: attemptId,
      assessment: result,
      targetText: currentDrill.french,
      mode: 'accent-analyzer',
    });
    if (evidenceEvents.length > 0) appendEvidenceEvents(evidenceEvents);
  };

  const analyze = async (audioBlob: Blob) => {
    setScreenState('analyzing');
    setErrorMessage(null);
    try {
      const result = await assessPronunciation({
        audioBlob,
        targetText: currentDrill.french,
        source: 'accent_analyzer',
      });

      setAssessment(result);
      recordAttempt(result);

      if (result.couldNotAssess || result.score === null) {
        setScreenState('could-not-assess');
        return;
      }

      if (result.provider !== 'azure') {
        // whisper-heuristic tier: still show results, but the source badge
        // and offline-tier framing make the degraded confidence visible.
        setScreenState('offline-tier');
      } else if (result.confidence && result.confidence.overall < LOW_CONFIDENCE_FLOOR) {
        setScreenState('low-confidence');
      } else {
        setScreenState('results');
      }

      const score = result.score;
      if (score >= PRACTICE_PASS_SCORE) {
        const xp = Math.round((score / 10) * (attempts === 1 ? 2 : 1.5));
        setSessionXP(s => s + xp);
        dispatchAddXP(dispatch, xp, 'accent_analyzer');
      }
      if (score >= 90) {
        dispatch({ type: 'MARK_DRILL_MASTERED', drillId: currentDrill.id });
      }
    } catch (err) {
      console.error('Accent evaluation failed:', err);
      if (err instanceof AudioTooShortError) {
        // The normalizer measured the decoded audio, which is stricter than
        // handleStop's wall-clock guard — route it to the same "say a bit
        // more" affordance rather than a dead-end "Evaluation failed".
        setScreenState('too-short');
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : 'Evaluation failed. Please try again.');
      setScreenState('error');
    }
  };

  const handleStart = async () => {
    try {
      await start();
      // Clock starts only once the mic is actually live. Starting it before
      // `await start()` folded the getUserMedia permission-prompt delay into
      // the measured duration, so a first-time user who granted access and
      // stopped immediately cleared MIN_RECORDING_MS with near-zero audio —
      // which then failed to decode and was uploaded as an unassessable clip.
      setRecordingStartedAt(Date.now());
      setAttempts(prev => prev + 1);
      setScreenState('recording');
    } catch {
      setScreenState('permission-denied');
    }
  };

  const handleStop = async () => {
    const recorded = await stop();
    const durationMs = recordingStartedAt ? Date.now() - recordingStartedAt : 0;
    if (!recorded || recorded.blob.size < MIN_RECORDING_BYTES || durationMs < MIN_RECORDING_MS) {
      setScreenState('too-short');
      return;
    }
    await analyze(recorded.blob);
  };

  const nextDrill = () => {
    if (currentIndex < PRONUNCIATION_DRILLS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setAttempts(0);
    reset();
  };

  const isSuccess = assessment != null && assessment.score != null && assessment.score >= PRACTICE_PASS_SCORE;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">Accent Analyzer</h1>
            <p className="text-xs text-slate-500">Fine-tune your French pronunciation</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              {sessionXP} XP
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Target size={20} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drills List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-1">Drills</h2>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {PRONUNCIATION_DRILLS.map((drill, idx) => (
                <button
                  key={drill.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setAttempts(0);
                    reset();
                  }}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-300 border ${
                    currentIndex === idx
                      ? 'bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/20'
                      : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      drill.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                      drill.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {drill.difficulty}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500 flex items-center gap-1">
                      {state.masteredDrills.includes(drill.id) && <Crown size={10} className="text-amber-400" />}
                      {drill.focus}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mb-0.5">{drill.french}</p>
                  <p className="text-[10px] text-slate-600 font-mono">/{drill.ipa}/</p>
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-3xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Target size={120} className="text-cyan-500" />
              </div>

              <div className="space-y-2 relative w-full">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{currentDrill.focus}</h3>
                  {isMastered && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                      <Crown size={10} className="text-amber-400" />
                      <span className="text-[8px] font-bold text-amber-400 uppercase">Mastered</span>
                    </div>
                  )}
                </div>
                <p className="text-3xl font-black text-white leading-tight">{currentDrill.french}</p>
                <p className="text-slate-600 font-mono text-sm">/{currentDrill.ipa}/</p>
                <button
                  onClick={() => speakFrench(currentDrill.french)}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all group"
                >
                  <Volume2 size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Listen to native</span>
                </button>
                <div className="pt-2 flex items-start gap-2 text-left bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <Info size={12} className="flex-shrink-0 text-cyan-500 mt-0.5" />
                  <span className="text-[10px] text-slate-400">{currentDrill.tip}</span>
                </div>
              </div>

              {/* State machine */}
              <div className="w-full max-w-sm py-4">
                <AnimatePresence mode="wait">
                  {screenState === 'permission-denied' ? (
                    <motion.div key="permission-denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <ShieldAlert size={28} className="text-amber-400" />
                      </div>
                      <p className="text-amber-400 font-bold text-sm">Microphone access needed</p>
                      <p className="text-slate-500 text-xs max-w-xs">Allow microphone access in your browser to record your pronunciation.</p>
                      <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all">
                        <RotateCcw size={14} /> Try Again
                      </button>
                    </motion.div>
                  ) : screenState === 'too-short' ? (
                    <motion.div key="too-short" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <AlertTriangle size={28} className="text-amber-400" />
                      </div>
                      <p className="text-amber-400 font-bold text-sm">Recording too short</p>
                      <p className="text-slate-500 text-xs max-w-xs">Hold the mic a little longer and say the full phrase.</p>
                      <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all">
                        <RotateCcw size={14} /> Try Again
                      </button>
                    </motion.div>
                  ) : screenState === 'could-not-assess' ? (
                    <motion.div key="could-not-assess" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <Info size={28} className="text-rose-400" />
                      </div>
                      <p className="text-rose-400 font-bold text-sm">Couldn't assess that recording</p>
                      <p className="text-slate-500 text-xs max-w-xs">
                        {assessment?.couldNotAssessReason === 'silence' || assessment?.couldNotAssessReason === 'no_speech_recognized'
                          ? "We didn't hear anything — try recording again in a quiet space."
                          : 'We had trouble analyzing that clip. Please try again.'}
                      </p>
                      <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all">
                        <RotateCcw size={14} /> Try Again
                      </button>
                    </motion.div>
                  ) : screenState === 'error' ? (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <Info size={28} className="text-rose-400" />
                      </div>
                      <p className="text-rose-400 font-bold text-sm">Evaluation failed</p>
                      <p className="text-slate-500 text-xs max-w-xs">{errorMessage}</p>
                      <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all">
                        <RotateCcw size={14} /> Try Again
                      </button>
                    </motion.div>
                  ) : screenState === 'idle' ? (
                    <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center space-y-6">
                      <button
                        onClick={handleStart}
                        className="w-24 h-24 rounded-full bg-cyan-500 flex items-center justify-center shadow-xl shadow-cyan-500/30 border-4 border-cyan-500/20 hover:scale-105 active:scale-95 transition-all group"
                      >
                        <Mic size={32} className="text-white group-hover:rotate-12 transition-transform" />
                      </button>
                      <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Tap to start analyzing</p>
                    </motion.div>
                  ) : screenState === 'recording' ? (
                    <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-6">
                      <div className="h-16 flex items-center justify-center">
                        <Waveform data={waveData} isRecording={isRecording} source={micLevel} />
                      </div>
                      <p className="text-cyan-400 font-bold animate-pulse text-sm">Recording... Speak now</p>
                      <button
                        onClick={handleStop}
                        className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/40 border-4 border-rose-500/20 group relative mx-auto"
                      >
                        <div className="absolute inset-0 rounded-full animate-ping bg-rose-500/20" />
                        <div className="w-6 h-6 bg-white rounded-sm" />
                      </button>
                    </motion.div>
                  ) : screenState === 'analyzing' ? (
                    <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center space-y-4">
                      <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10" />
                        <motion.div
                          className="absolute inset-0 rounded-full border-4 border-t-cyan-500"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                      </div>
                      <p className="text-cyan-400 font-bold text-sm animate-pulse">Analyzing your pronunciation...</p>
                    </motion.div>
                  ) : (
                    // results | low-confidence | offline-tier all render the same score panel;
                    // the badges/banners below express the distinction, per plan §16's
                    // "never render derived metrics as Azure scores" / "always show provider badge".
                    assessment && assessment.score !== null && (
                      <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
                        {screenState === 'low-confidence' && (
                          <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left">
                            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-300">We couldn't assess this reliably — try recording again in a quieter spot.</p>
                          </div>
                        )}

                        <div className="flex justify-center gap-12">
                          <div className="text-center space-y-1">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="40" className="stroke-white/5 fill-none" strokeWidth="8" />
                                <motion.circle
                                  cx="48" cy="48" r="40"
                                  className="stroke-cyan-500 fill-none"
                                  strokeWidth="8"
                                  strokeDasharray={251.2}
                                  initial={{ strokeDashoffset: 251.2 }}
                                  animate={{ strokeDashoffset: 251.2 - (251.2 * assessment.score) / 100 }}
                                  transition={{ duration: 1.5, ease: 'easeOut' }}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-white">{Math.round(assessment.score)}</span>
                                <span className="text-[8px] font-bold text-cyan-400 uppercase">Score</span>
                              </div>
                            </div>
                          </div>

                          {assessment.subScores && (
                            <div className="flex flex-col justify-center space-y-4">
                              <div className="space-y-1">
                                <div className="flex justify-between items-center w-32">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">Accuracy</span>
                                  <span className="text-[9px] font-bold text-white">{Math.round(assessment.subScores.accuracy)}%</span>
                                </div>
                                <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${assessment.subScores.accuracy}%` }} transition={{ duration: 1, delay: 0.5 }} />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center w-32">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">Fluency</span>
                                  <span className="text-[9px] font-bold text-white">{Math.round(assessment.subScores.fluency)}%</span>
                                </div>
                                <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div className="h-full bg-amber-500" initial={{ width: 0 }} animate={{ width: `${assessment.subScores.fluency}%` }} transition={{ duration: 1, delay: 0.7 }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <PronunciationSourceBadge provider={assessment.provider} />

                        <PronunciationHeatMap assessment={assessment} onSpeakWord={speakFrench} />

                        {assessment.phonologicalFindings && assessment.phonologicalFindings.length > 0 && (
                          <div className="space-y-2 text-left">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Findings</h3>
                            {assessment.phonologicalFindings.map((finding, idx) => (
                              <div key={idx} className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-start gap-2">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase flex-shrink-0 ${
                                  finding.provenance === 'authoritative' ? 'bg-emerald-500/10 text-emerald-400' :
                                  finding.provenance === 'derived' ? 'bg-cyan-500/10 text-cyan-400' :
                                  'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {finding.provenance}
                                </span>
                                <p className="text-[11px] text-slate-300 leading-relaxed">{finding.explanation}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {assessment.coaching && (
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left space-y-2">
                            <p className="text-xs text-slate-300 leading-relaxed italic">"{assessment.coaching.summary}"</p>
                            <p className="text-[11px] text-cyan-400 font-bold">Next: {assessment.coaching.topPriority}</p>
                          </div>
                        )}

                        <div className="flex gap-3 justify-center">
                          <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all">
                            <RotateCcw size={14} /> Try Again
                          </button>
                          {isSuccess && (
                            <button
                              onClick={nextDrill}
                              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                            >
                              Next Drill <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Real stats — no fabricated numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Crown size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Sounds Mastered</p>
                  <p className="text-lg font-black text-white">{masteredCount} / {PRONUNCIATION_DRILLS.length}</p>
                </div>
              </div>
              <div className="glass rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total Attempts</p>
                  <p className="text-lg font-black text-white">{history.length}</p>
                </div>
              </div>
            </div>

            {/* History strip — segmented by (assessorVersion, provider), plan §13/§16 */}
            {historySegments.length > 0 && (
              <div className="glass rounded-2xl p-4 space-y-3">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent History</h3>
                <div className="space-y-3">
                  {historySegments.slice(-3).map((segment, segIdx) => (
                    <div key={segIdx} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
                          {segment.provider === 'azure' ? 'Azure' : 'Estimated'} · {segment.assessorVersion}
                        </span>
                        {segIdx > 0 && <WifiOff size={9} className="text-slate-700" />}
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {segment.attempts.slice(-20).map(attempt => (
                          <div
                            key={attempt.id}
                            title={attempt.score !== null ? `${Math.round(attempt.score)}` : 'Could not assess'}
                            className={`w-2 h-6 rounded-full ${
                              attempt.score === null ? 'bg-slate-700' :
                              attempt.score >= PRACTICE_PASS_SCORE ? 'bg-emerald-500' :
                              attempt.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
