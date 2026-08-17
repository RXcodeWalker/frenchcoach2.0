/**
 * Shadowing Mode panel (Phase 4). Self-contained: owns its own audio
 * recorder, phrase cursor, and state machine — rendered inside
 * AccentAnalyzer.tsx's practiceMode === 'shadowing' branch, never mounted
 * alongside the Drills grid.
 *
 * Reuses unchanged: useAudioBlobRecorder, Waveform, TTS, assessPronunciation,
 * AudioTooShortError, PRACTICE_PASS_SCORE, PronunciationSourceBadge,
 * PronunciationHeatMap, pronunciation history + evidence + XP + mastery
 * plumbing — same as AccentAnalyzer's own Drills flow.
 *
 * Lifecycle safety AccentAnalyzer's Drills flow lacks today: an
 * isMountedRef guards every post-await setState, and an unmount effect
 * stops TTS and the recorder — prevents set-state-after-unmount when the
 * user navigates away mid-TTS, mid-recording, or mid-analysis.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  RotateCcw,
  Info,
  Volume2,
  Gauge,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useApp, dispatchAddXP } from '../../context/AppContext';
import { useAudioBlobRecorder } from '../../features/recording/useAudioBlobRecorder';
import { Waveform } from '../../features/recording/Waveform';
import { assessPronunciation } from '../../services/pronunciation/pronunciationClient';
import { AudioTooShortError } from '../../domain/pronunciation/audioNormalizer';
import { PronunciationSourceBadge } from '../learn/PronunciationSourceBadge';
import { PronunciationHeatMap } from '../../features/feedback/components/PronunciationHeatMap';
import { PRACTICE_PASS_SCORE } from '../../domain/pronunciation/practiceThresholds';
import { SHADOWING_PHRASES } from '../../data/shadowingPhrases';
import { TTS } from '../../services/tts/ttsService';
import {
  appendPronunciationAttempt,
  assessmentToAttemptRecord,
} from '../../services/pronunciation/pronunciationHistoryService';
import { pushPronunciationAttempt } from '../../services/sync/pronunciationSync';
import { buildPronunciationEvidence } from '../../services/coach/pronunciationEvidence';
import { appendEvidenceEvents } from '../../services/coach/coachStorage';
import {
  appendShadowingAttempt,
  assessmentToShadowingRecord,
  bestScoreForPhrase,
  getCoachingQuota,
  getShadowingHistory,
  isDetailedFeedbackEnabled,
  pushShadowingAttempt,
  setDetailedFeedbackEnabled,
  type ShadowingAttemptRecord,
} from '../../services/shadowing/shadowingService';
import type { PronunciationAssessment } from '../../domain/pronunciation/types';

type ScreenState =
  | 'idle'
  | 'listening'
  | 'recording'
  | 'too-short'
  | 'too-long'
  | 'permission-denied'
  | 'analyzing'
  | 'results'
  | 'low-confidence'
  | 'could-not-assess'
  | 'offline-tier'
  | 'error';

const MIN_RECORDING_MS = 400;
const MIN_RECORDING_BYTES = 1024;
const MAX_RECORDING_MS = 30_000;
const COUNTDOWN_WARN_MS = 25_000;
const LOW_CONFIDENCE_FLOOR = 0.4;

function makeAttemptId(): string {
  return `shad_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const QUOTA_REASON_COPY: Record<string, string> = {
  daily_limit_reached: 'Detailed feedback limit reached for today (3/3). Showing standard feedback.',
  unauthenticated: 'Sign in to use detailed feedback.',
  quota_unavailable: 'Detailed feedback is unavailable right now.',
  coaching_unavailable: 'Detailed feedback is unavailable right now.',
};

export function ShadowingPanel() {
  const { dispatch, authUser } = useApp();
  const { isRecording, start, stop, waveData, micLevel } = useAudioBlobRecorder();
  const isMountedRef = useRef(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [assessment, setAssessment] = useState<PronunciationAssessment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<ShadowingAttemptRecord[]>([]);
  const [hasFrenchVoice, setHasFrenchVoice] = useState(true);
  const [detailedOn, setDetailedOn] = useState(false);
  // Display-only counter, seeded from getCoachingQuota() then overwritten by
  // every response's coachingQuota — only {used, limit} are shown, so this
  // accepts either CoachingQuota (RPC read) or PronunciationCoachingQuota
  // (assessment response) without needing to reconcile their extra fields.
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [countdownMs, setCountdownMs] = useState(0);

  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptIdRef = useRef<string>(makeAttemptId());

  const phrase = SHADOWING_PHRASES[currentIndex];

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      void TTS.stop();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await TTS.ensureVoiceReady();
      if (cancelled || !isMountedRef.current) return;
      setHasFrenchVoice(TTS.hasFrenchVoice());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setHistory(getShadowingHistory());
    setDetailedOn(isDetailedFeedbackEnabled());
    (async () => {
      const q = await getCoachingQuota();
      if (isMountedRef.current) setQuota(q);
    })();
  }, []);

  const bestForPhrase = useMemo(
    () => bestScoreForPhrase(history, phrase.id),
    [history, phrase.id],
  );

  const reset = () => {
    setScreenState('idle');
    setAssessment(null);
    setErrorMessage(null);
  };

  const toggleDetailed = () => {
    const next = !detailedOn;
    setDetailedOn(next);
    setDetailedFeedbackEnabled(next);
  };

  const speak = async (rate?: number) => {
    if (!hasFrenchVoice) return;
    setScreenState('listening');
    try {
      await TTS.speak(phrase.french, rate ? { rate } : undefined);
    } finally {
      if (isMountedRef.current && screenState !== 'recording') setScreenState('idle');
    }
  };

  const recordAttempt = (result: PronunciationAssessment) => {
    const attemptId = attemptIdRef.current;

    const pronRecord = assessmentToAttemptRecord(attemptId, phrase.french, result);
    appendPronunciationAttempt(pronRecord);
    if (authUser) void pushPronunciationAttempt(authUser.id, pronRecord);

    const shadowingRecord = assessmentToShadowingRecord(attemptId, phrase.id, result);
    const next = appendShadowingAttempt(shadowingRecord);
    if (isMountedRef.current) setHistory(next);
    if (authUser) void pushShadowingAttempt(authUser.id, shadowingRecord);

    const evidenceEvents = buildPronunciationEvidence({
      attemptId,
      sessionId: attemptId,
      assessment: result,
      targetText: phrase.french,
      mode: 'shadowing',
    });
    if (evidenceEvents.length > 0) appendEvidenceEvents(evidenceEvents);
  };

  const analyze = async (audioBlob: Blob) => {
    setScreenState('analyzing');
    setErrorMessage(null);
    try {
      const result = await assessPronunciation({
        audioBlob,
        targetText: phrase.french,
        source: 'shadowing',
        mode: 'scripted',
        coaching: detailedOn ? 'full' : 'none',
        coachingRequestId: attemptIdRef.current,
      });

      if (!isMountedRef.current) return;

      setAssessment(result);
      recordAttempt(result);
      if (result.coachingQuota) {
        const { used, limit } = result.coachingQuota;
        setQuota({ used, limit });
      }

      if (result.couldNotAssess || result.score === null) {
        setScreenState('could-not-assess');
        return;
      }

      if (result.provider !== 'azure') {
        setScreenState('offline-tier');
      } else if (result.confidence && result.confidence.overall < LOW_CONFIDENCE_FLOOR) {
        setScreenState('low-confidence');
      } else {
        setScreenState('results');
      }

      const score = result.score;
      if (score >= PRACTICE_PASS_SCORE) {
        const xp = Math.round((score / 10) * (attempts === 1 ? 2 : 1.5));
        dispatchAddXP(dispatch, xp, 'shadowing');
      }
      if (score >= 90) {
        dispatch({ type: 'MARK_DRILL_MASTERED', drillId: phrase.id });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Shadowing evaluation failed:', err);
      if (err instanceof AudioTooShortError) {
        setScreenState('too-short');
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : 'Evaluation failed. Please try again.');
      setScreenState('error');
    }
  };

  const clearRecordTimers = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  };

  const handleStop = async () => {
    clearRecordTimers();
    const recorded = await stop();
    if (!isMountedRef.current) return;
    const durationMs = recordingStartedAt ? Date.now() - recordingStartedAt : 0;
    if (durationMs > MAX_RECORDING_MS) {
      setScreenState('too-long');
      return;
    }
    if (!recorded || recorded.blob.size < MIN_RECORDING_BYTES || durationMs < MIN_RECORDING_MS) {
      setScreenState('too-short');
      return;
    }
    await analyze(recorded.blob);
  };

  const handleStart = async () => {
    attemptIdRef.current = makeAttemptId();
    try {
      await start();
      if (!isMountedRef.current) return;
      // Clock starts only once the mic is actually live — folding the
      // getUserMedia permission-prompt delay into the measured duration
      // would let a near-instant stop clear MIN_RECORDING_MS with near-zero
      // audio (AccentAnalyzer.tsx precedent).
      const startedAt = Date.now();
      setRecordingStartedAt(startedAt);
      setAttempts(prev => prev + 1);
      setScreenState('recording');
      setCountdownMs(0);

      recordTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= COUNTDOWN_WARN_MS) {
          setCountdownMs(Math.max(0, MAX_RECORDING_MS - elapsed));
        }
      }, 250);
      autoStopTimerRef.current = setTimeout(() => {
        void handleStop();
      }, MAX_RECORDING_MS);
    } catch {
      if (isMountedRef.current) setScreenState('permission-denied');
    }
  };

  const nextPhrase = () => {
    setCurrentIndex(prev => (prev < SHADOWING_PHRASES.length - 1 ? prev + 1 : 0));
    setAttempts(0);
    reset();
  };

  const isSuccess = assessment != null && assessment.score != null && assessment.score >= PRACTICE_PASS_SCORE;
  const quotaReason = assessment?.coachingQuota?.granted === false ? assessment.coachingQuota.reason ?? null : null;

  return (
    <div className="space-y-6">
      {/* Detailed feedback toggle */}
      <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-cyan-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Detailed feedback</p>
            {!authUser ? (
              <p className="text-[10px] text-slate-500">Sign in to use detailed feedback</p>
            ) : quota ? (
              <p className="text-[10px] text-slate-500">{quota.used} / {quota.limit} used today</p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          disabled={screenState === 'analyzing' || !authUser}
          onClick={toggleDetailed}
          aria-pressed={detailedOn}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${
            detailedOn ? 'bg-cyan-500' : 'bg-white/10'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              detailedOn ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      <div className="glass rounded-3xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
        <div className="space-y-2 relative w-full">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{phrase.focus}</h3>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
              phrase.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
              phrase.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
              'bg-rose-500/10 text-rose-400'
            }`}>
              {phrase.difficulty}
            </span>
          </div>
          <p className="text-3xl font-black text-white leading-tight">{phrase.french}</p>
          <p className="text-slate-500 text-sm">{phrase.english}</p>

          {!hasFrenchVoice && (
            <div className="flex items-start gap-2 text-left bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
              <AlertTriangle size={12} className="flex-shrink-0 text-amber-400 mt-0.5" />
              <span className="text-[10px] text-amber-300">
                No French voice is available in this browser. Shadowing needs one — try Chrome or Edge.
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={!hasFrenchVoice}
              onClick={() => speak()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-all group"
            >
              <Volume2 size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold">Listen</span>
            </button>
            <button
              type="button"
              disabled={!hasFrenchVoice}
              onClick={() => speak(0.6)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-all group"
            >
              <Gauge size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold">Listen slowly</span>
            </button>
          </div>

          <div className="pt-2 flex items-start gap-2 text-left bg-slate-900/40 rounded-xl p-3 border border-white/5">
            <Info size={12} className="flex-shrink-0 text-cyan-500 mt-0.5" />
            <span className="text-[10px] text-slate-400">{phrase.tip}</span>
          </div>
        </div>

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
            ) : screenState === 'too-long' ? (
              <motion.div key="too-long" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle size={28} className="text-amber-400" />
                </div>
                <p className="text-amber-400 font-bold text-sm">Recording too long</p>
                <p className="text-slate-500 text-xs max-w-xs">Shadowing phrases are short — try again and stop within 30 seconds.</p>
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
            ) : screenState === 'idle' || screenState === 'listening' ? (
              <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center space-y-6">
                <button
                  onClick={handleStart}
                  className="w-24 h-24 rounded-full bg-cyan-500 flex items-center justify-center shadow-xl shadow-cyan-500/30 border-4 border-cyan-500/20 hover:scale-105 active:scale-95 transition-all group"
                >
                  <Mic size={32} className="text-white group-hover:rotate-12 transition-transform" />
                </button>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  {screenState === 'listening' ? 'Playing reference audio...' : 'Tap to start recording'}
                </p>
              </motion.div>
            ) : screenState === 'recording' ? (
              <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-6">
                <div className="h-16 flex items-center justify-center">
                  <Waveform data={waveData} isRecording={isRecording} source={micLevel} />
                </div>
                <p className="text-cyan-400 font-bold animate-pulse text-sm">
                  {countdownMs > 0 ? `Recording... auto-stop in ${Math.ceil(countdownMs / 1000)}s` : 'Recording... Speak now'}
                </p>
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
              assessment && assessment.score !== null && (
                <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
                  {screenState === 'low-confidence' && (
                    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left">
                      <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-300">We couldn't assess this reliably — try recording again in a quieter spot.</p>
                    </div>
                  )}

                  <div className="flex justify-center">
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
                  </div>

                  {assessment.subScores && (
                    <div className="flex flex-col items-center space-y-3">
                      {([
                        ['Accuracy', assessment.subScores.accuracy, 'bg-emerald-500'],
                        ['Fluency', assessment.subScores.fluency, 'bg-amber-500'],
                      ] as const).map(([label, value, color]) => (
                        <div key={label} className="space-y-1 w-40">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
                            <span className="text-[9px] font-bold text-white">{Math.round(value)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div className={`h-full ${color}`} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, delay: 0.5 }} />
                          </div>
                        </div>
                      ))}
                      {assessment.subScores.completeness !== null && (
                        <div className="space-y-1 w-40">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Said the whole phrase</span>
                            <span className="text-[9px] font-bold text-white">{Math.round(assessment.subScores.completeness)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-violet-500" initial={{ width: 0 }} animate={{ width: `${assessment.subScores.completeness}%` }} transition={{ duration: 1, delay: 0.9 }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <PronunciationSourceBadge provider={assessment.provider} />

                  <PronunciationHeatMap assessment={assessment} onSpeakWord={(w) => void TTS.speak(w)} />

                  {/* Rhythm block — Azure tier only (review item per plan §5) */}
                  {assessment.prosodyMetrics != null ? (
                    <div className="space-y-2 text-left bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rhythm</h3>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase bg-cyan-500/10 text-cyan-400">derived</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm font-black text-white">{assessment.prosodyMetrics.speechRateWpm !== null ? Math.round(assessment.prosodyMetrics.speechRateWpm) : '—'}</p>
                          <p className="text-[8px] text-slate-500 uppercase">Words/min</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{assessment.prosodyMetrics.pauseCount ?? '—'}</p>
                          <p className="text-[8px] text-slate-500 uppercase">Pauses</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">
                            {assessment.prosodyMetrics.rhythmRegularity !== null ? Math.round(assessment.prosodyMetrics.rhythmRegularity * 100) : '—'}
                          </p>
                          <p className="text-[8px] text-slate-500 uppercase">Regularity</p>
                        </div>
                      </div>
                      {bestForPhrase && bestForPhrase.score !== null && (
                        <p className="text-[10px] text-slate-500 pt-1">
                          Your best on this phrase so far: {Math.round(bestForPhrase.score)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 text-left px-1">
                      Rhythm analysis needs the full analyzer — not available for this attempt.
                    </p>
                  )}

                  {assessment.coaching && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left space-y-2">
                      <p className="text-xs text-slate-300 leading-relaxed italic">"{assessment.coaching.summary}"</p>
                      <p className="text-[11px] text-cyan-400 font-bold">Next: {assessment.coaching.topPriority}</p>
                      {assessment.coaching.tips.map((tip, i) => (
                        <p key={i} className="text-[10px] text-slate-400">• {tip}</p>
                      ))}
                    </div>
                  )}

                  {quotaReason && quotaReason !== 'could_not_assess' && (
                    <div className="flex items-start gap-2 text-left px-3 py-2 rounded-lg bg-slate-900/40 border border-white/5">
                      <Lock size={12} className="flex-shrink-0 text-slate-500 mt-0.5" />
                      <p className="text-[10px] text-slate-400">{QUOTA_REASON_COPY[quotaReason] ?? 'Detailed feedback is unavailable right now.'}</p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center">
                    <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all">
                      <RotateCcw size={14} /> Try Again
                    </button>
                    {isSuccess && (
                      <button
                        onClick={nextPhrase}
                        className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                      >
                        Next Phrase <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
