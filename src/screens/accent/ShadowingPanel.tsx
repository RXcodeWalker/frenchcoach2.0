/**
 * Shadowing Mode panel (Phase 4). Self-contained: owns its own audio
 * recorder, phrase cursor, and state machine — rendered inside
 * AccentAnalyzer.tsx's practiceMode === 'shadowing' branch, never mounted
 * alongside the Drills grid.
 *
 * Reuses unchanged: useAudioBlobRecorder, TTS, assessPronunciation,
 * AudioTooShortError, PRACTICE_PASS_SCORE, PronunciationSourceBadge,
 * pronunciation history + evidence + XP + mastery
 * plumbing — same as AccentAnalyzer's own Drills flow.
 *
 * Lifecycle safety AccentAnalyzer's Drills flow lacks today: an
 * isMountedRef guards every post-await setState, and an unmount effect
 * stops TTS and the recorder — prevents set-state-after-unmount when the
 * user navigates away mid-TTS, mid-recording, or mid-analysis.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  Loader2,
} from 'lucide-react';
import { useApp, dispatchAddXP } from '../../context/AppContext';
import { useAudioBlobRecorder } from '../../features/recording/useAudioBlobRecorder';
import { LevelBars } from '../../features/recording/LevelBars';
import { assessPronunciation } from '../../services/pronunciation/pronunciationClient';
import { AudioTooShortError } from '../../domain/pronunciation/audioNormalizer';
import { isConsentRequiredError } from '../../lib/consentRequired';
import { GuardianConsentNotice } from '../../components/GuardianConsentNotice';
import { PronunciationSourceBadge } from '../learn/PronunciationSourceBadge';
import { AccentWordMap } from './AccentWordMap';
import { DifficultyPill, StateNotice, ScoreRing, SubScore } from './AccentParts';
import { Toggle } from '../../components/ui/SettingToggle';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced } from '../../components/motion/variants';
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
  | 'consent-required'
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
  const { isRecording, start, stop, micLevel } = useAudioBlobRecorder();
  const isMountedRef = useRef(true);
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;

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
      setHasFrenchVoice(TTS.canSpeakFrench(true));
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
      await TTS.speak(phrase.french, { rate, recorded: true });
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
      if (isConsentRequiredError(err)) {
        // The backend's consent gate: a `pending` under-13 account. Retrying
        // can't help until a parent/guardian confirms.
        setScreenState('consent-required');
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
    <div className="flex flex-col gap-6">
      {/* Detailed feedback toggle */}
      <motion.div variants={item} className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-recessed text-ink-muted">
          <Sparkles size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] font-semibold text-ink">Detailed feedback</span>
          {!authUser ? (
            <span className="text-[13px] text-ink-subtle">Sign in to use detailed feedback</span>
          ) : quota ? (
            <span className="text-[13px] text-ink-subtle"><span className="font-numeral">{quota.used} / {quota.limit}</span> used today</span>
          ) : null}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={detailedOn}
          aria-label="Detailed feedback"
          disabled={screenState === 'analyzing' || !authUser}
          onClick={toggleDetailed}
          className="flex h-11 w-12 shrink-0 items-center justify-center rounded-control disabled:cursor-default"
        >
          <span className={!authUser || screenState === 'analyzing' ? 'grayscale' : ''}><Toggle on={detailedOn} /></span>
        </button>
      </motion.div>

      <motion.section variants={item} className="flex flex-col items-center gap-6 rounded-card border border-hairline bg-surface p-6 text-center md:p-8">
        <div className="flex w-full flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-eyebrow text-ink-subtle">{phrase.focus}</span>
            <DifficultyPill difficulty={phrase.difficulty} />
          </div>
          <p lang="fr" className="text-[30px] font-semibold leading-tight tracking-[-0.01em] text-ink">{phrase.french}</p>
          <p className="text-[14px] text-ink-muted">{phrase.english}</p>

          {!hasFrenchVoice && (
            <p className="flex w-full max-w-[520px] items-start gap-2 rounded-control bg-reward-soft px-3 py-2.5 text-left text-[13px] text-reward-text">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              No French voice is available in this browser. Shadowing needs one — try Chrome or Edge.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={!hasFrenchVoice} onClick={() => speak()}>
              <Volume2 size={16} aria-hidden="true" /> Listen
            </Button>
            <Button variant="secondary" size="sm" disabled={!hasFrenchVoice} onClick={() => speak(0.6)}>
              <Gauge size={16} aria-hidden="true" /> Listen slowly
            </Button>
          </div>

          <p className="mt-2 flex w-full max-w-[520px] items-start gap-2 rounded-control bg-info-soft px-3 py-2.5 text-left text-[13px] text-info-text">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{phrase.tip}</span>
          </p>
        </div>

        <div className="w-full max-w-[460px]" aria-live="polite">
          <AnimatePresence mode="wait">
            {screenState === 'permission-denied' ? (
              <StateNotice key="permission-denied" icon={<ShieldAlert size={22} />} title="Microphone access needed" onRetry={reset}>
                Allow microphone access in your browser to record your pronunciation.
              </StateNotice>
            ) : screenState === 'too-short' ? (
              <StateNotice key="too-short" icon={<AlertTriangle size={22} />} title="Recording too short" onRetry={reset}>
                Hold the mic a little longer and say the full phrase.
              </StateNotice>
            ) : screenState === 'too-long' ? (
              <StateNotice key="too-long" icon={<AlertTriangle size={22} />} title="Recording too long" onRetry={reset}>
                Shadowing phrases are short — try again and stop within 30 seconds.
              </StateNotice>
            ) : screenState === 'could-not-assess' ? (
              <StateNotice key="could-not-assess" icon={<Info size={22} />} title="Couldn't assess that recording" onRetry={reset}>
                {assessment?.couldNotAssessReason === 'silence' || assessment?.couldNotAssessReason === 'no_speech_recognized'
                  ? "We didn't hear anything — try recording again in a quiet space."
                  : 'We had trouble analyzing that clip. Please try again.'}
              </StateNotice>
            ) : screenState === 'consent-required' ? (
              <motion.div key="consent-required" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GuardianConsentNotice />
              </motion.div>
            ) : screenState === 'error' ? (
              <StateNotice key="error" icon={<Info size={22} />} title="Evaluation failed" tone="error" onRetry={reset}>
                {errorMessage}
              </StateNotice>
            ) : screenState === 'idle' || screenState === 'listening' ? (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleStart}
                  aria-label="Start recording"
                  className="flex h-16 w-16 items-center justify-center rounded-pill bg-action text-action-ink transition-[background-color,transform]
                    duration-state ease-smooth hover:bg-action-hover active:scale-[.97] active:bg-action-press"
                >
                  <Mic size={24} aria-hidden="true" />
                </button>
                <span className="text-[14px] font-semibold text-ink">
                  {screenState === 'listening' ? 'Playing reference audio…' : 'Tap to record the phrase'}
                </span>
                <span className="text-[13px] text-ink-muted">Listen first, then say it right after the voice</span>
              </motion.div>
            ) : screenState === 'recording' ? (
              <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                <LevelBars active={isRecording} source={micLevel} centred />
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="Stop recording"
                  className="flex h-16 w-16 items-center justify-center rounded-pill bg-ink shadow-[0_0_0_6px_var(--surface),0_0_0_7px_var(--hairline-strong)]
                    transition-transform duration-state ease-smooth active:scale-[.97]"
                >
                  <span className="h-[18px] w-[18px] rounded-[4px] bg-surface" />
                </button>
                <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <span className="h-2 w-2 rounded-pill bg-correction" aria-hidden="true" />
                  {countdownMs > 0 ? `Recording · auto-stop in ${Math.ceil(countdownMs / 1000)}s` : 'Recording · tap to stop'}
                </span>
              </motion.div>
            ) : screenState === 'analyzing' ? (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <span className="flex h-16 w-16 items-center justify-center rounded-pill border border-hairline bg-surface-recessed text-ink-muted">
                  <Loader2 size={24} className="animate-spin" aria-hidden="true" />
                </span>
                <span className="text-[14px] font-semibold text-ink">Analysing your pronunciation…</span>
              </motion.div>
            ) : (
              assessment && assessment.score !== null && (
                <motion.div key="results" variants={item} initial="hidden" animate="show" className="flex w-full flex-col gap-5">
                  {screenState === 'low-confidence' && (
                    <p className="flex items-start gap-2 rounded-control bg-reward-soft px-3 py-2.5 text-left text-[13px] text-reward-text">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      We couldn't assess this reliably — try recording again in a quieter spot.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
                    <ScoreRing score={assessment.score} reduced={!!reduced} />
                    {assessment.subScores && (
                      <div className="flex w-40 flex-col gap-4 text-left">
                        <SubScore label="Accuracy" value={assessment.subScores.accuracy} reduced={!!reduced} />
                        <SubScore label="Fluency" value={assessment.subScores.fluency} reduced={!!reduced} />
                        {assessment.subScores.completeness !== null && (
                          <SubScore label="Whole phrase" value={assessment.subScores.completeness} reduced={!!reduced} />
                        )}
                      </div>
                    )}
                  </div>

                  <PronunciationSourceBadge provider={assessment.provider} />

                  {assessment.provider === 'azure' && (
                    <div className="flex flex-col gap-2 rounded-card bg-surface-recessed p-4">
                      <h3 className="text-eyebrow text-left text-ink-subtle">Word by word</h3>
                      <AccentWordMap assessment={assessment} onSpeakWord={(w) => void TTS.speak(w)} />
                    </div>
                  )}

                  {/* Rhythm block — Azure tier only (review item per plan §5) */}
                  {assessment.prosodyMetrics != null ? (
                    <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 text-left">
                      <div className="flex items-center justify-between">
                        <h3 className="text-eyebrow text-ink-subtle">Rhythm</h3>
                        <span className="rounded-pill bg-info-soft px-2 py-0.5 text-caption font-semibold text-info-text">Derived</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <Metric value={assessment.prosodyMetrics.speechRateWpm !== null ? Math.round(assessment.prosodyMetrics.speechRateWpm) : '—'} label="Words/min" />
                        <Metric value={assessment.prosodyMetrics.pauseCount ?? '—'} label="Pauses" />
                        <Metric
                          value={assessment.prosodyMetrics.rhythmRegularity !== null ? Math.round(assessment.prosodyMetrics.rhythmRegularity * 100) : '—'}
                          label="Regularity"
                        />
                      </div>
                      {bestForPhrase && bestForPhrase.score !== null && (
                        <p className="text-[13px] text-ink-muted">
                          Your best on this phrase so far: <span className="font-numeral text-ink">{Math.round(bestForPhrase.score)}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-left text-[13px] text-ink-subtle">
                      Rhythm analysis needs the full analyzer — not available for this attempt.
                    </p>
                  )}

                  {assessment.coaching && (
                    <div className="flex flex-col gap-1.5 rounded-card bg-action-soft p-4 text-left">
                      <p className="text-[14px] leading-relaxed text-ink">{assessment.coaching.summary}</p>
                      <p className="text-[13px] font-semibold text-action-text">Next: {assessment.coaching.topPriority}</p>
                      {assessment.coaching.tips.length > 0 && (
                        <ul className="list-disc pl-5 text-[13px] text-ink-muted">
                          {assessment.coaching.tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {quotaReason && quotaReason !== 'could_not_assess' && (
                    <p className="flex items-start gap-2 rounded-control bg-surface-recessed px-3 py-2.5 text-left text-[13px] text-ink-muted">
                      <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {QUOTA_REASON_COPY[quotaReason] ?? 'Detailed feedback is unavailable right now.'}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-center gap-3">
                    <Button variant={isSuccess ? 'secondary' : 'primary'} onClick={reset}>
                      <RotateCcw size={16} aria-hidden="true" /> Try again
                    </Button>
                    {isSuccess && (
                      <Button onClick={nextPhrase}>
                        Next phrase <ChevronRight size={16} aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </motion.section>
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-numeral text-[22px] leading-none text-ink">{value}</span>
      <span className="text-caption text-ink-subtle">{label}</span>
    </div>
  );
}
