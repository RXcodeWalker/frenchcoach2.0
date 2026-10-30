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
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Mic,
  RotateCcw,
  Info,
  Volume2,
  ChevronRight,
  Trophy,
  Crown,
  WifiOff,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Zap,
} from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { resolveFeatureStatus } from '../config/featureFlags';
import { ShadowingPanel } from './accent/ShadowingPanel';
import { useAudioBlobRecorder } from '../features/recording/useAudioBlobRecorder';
import { LevelBars } from '../features/recording/LevelBars';
import { assessPronunciation } from '../services/pronunciation/pronunciationClient';
import { AudioTooShortError } from '../domain/pronunciation/audioNormalizer';
import { isConsentRequiredError } from '../lib/consentRequired';
import { GuardianConsentNotice } from '../components/GuardianConsentNotice';
import { PronunciationSourceBadge } from './learn/PronunciationSourceBadge';
import { AccentWordMap } from './accent/AccentWordMap';
import { DifficultyPill, StateNotice, ScoreRing, SubScore } from './accent/AccentParts';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { Stat } from '../components/ui/Stat';
import { enter, enterReduced } from '../components/motion/variants';
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
  | 'consent-required'
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
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const { state, dispatch, authUser } = useApp();
  const { isRecording, start, stop, micLevel } = useAudioBlobRecorder();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [assessment, setAssessment] = useState<PronunciationAssessment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<PronunciationAttemptRecord[]>([]);
  const [practiceMode, setPracticeMode] = useState<'drills' | 'shadowing'>('drills');
  const shadowingLive = resolveFeatureStatus('shadowingMode') === 'live';

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

  const goToDrill = (idx: number) => {
    setCurrentIndex(idx);
    setAttempts(0);
    reset();
  };

  return (
    <>
      <TopContextBar title="Accent Analyzer" subtitle="Fine-tune your French pronunciation" showBack backLabel="Back" />
      <PageShell maxWidth="xl" gap={24}>
        <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
          {shadowingLive ? (
            <Segmented<'drills' | 'shadowing'>
              label="Practice mode"
              value={practiceMode}
              onChange={setPracticeMode}
              height={40}
              className="w-full sm:w-[280px]"
              options={[
                { id: 'drills', label: 'Drills' },
                { id: 'shadowing', label: 'Shadowing' },
              ]}
            />
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Stat role="progress" title="Sounds mastered" icon={<Crown size={14} />}>
              {masteredCount} / {PRONUNCIATION_DRILLS.length} mastered
            </Stat>
            <Stat role="neutral" title="Total attempts" icon={<Trophy size={14} />}>
              {history.length} attempts
            </Stat>
            <Stat role="reward" soft title="XP earned this visit" icon={<Zap size={14} />}>
              +{sessionXP} XP
            </Stat>
          </div>
        </motion.div>

        {practiceMode === 'shadowing' && shadowingLive ? (
          <motion.div variants={item}>
            <ShadowingPanel />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* Drills list */}
            <motion.section variants={item} aria-labelledby="accent-drills" className="order-2 flex flex-col gap-3 lg:order-1">
              <h2 id="accent-drills" className="text-section text-ink">Drills</h2>
              <ul className="flex flex-col gap-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
                {PRONUNCIATION_DRILLS.map((drill, idx) => {
                  const on = currentIndex === idx;
                  const done = state.masteredDrills.includes(drill.id);
                  return (
                    <li key={drill.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => goToDrill(idx)}
                        className={`flex w-full flex-col gap-1 rounded-card border p-4 text-left transition-colors duration-state ease-smooth active:scale-[.98]
                          ${on ? 'border-action bg-action-soft' : 'border-hairline bg-surface hover:border-hairline-strong'}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <DifficultyPill difficulty={drill.difficulty} />
                          <span className="flex items-center gap-1 text-caption text-ink-subtle">
                            {done && <Crown size={12} className="text-reward-text" aria-label="Mastered" />}
                            {drill.focus}
                          </span>
                        </span>
                        <span lang="fr" className="text-[15px] font-semibold text-ink">{drill.french}</span>
                        <span className="text-caption text-ink-subtle">/{drill.ipa}/</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.section>

            {/* Practice area */}
            <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
              <motion.section variants={item} className="flex flex-col items-center gap-6 rounded-card border border-hairline bg-surface p-6 text-center md:p-8">
                <div className="flex w-full flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-eyebrow text-ink-subtle">{currentDrill.focus}</span>
                    {isMastered && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-reward-soft px-2 py-0.5 text-caption font-semibold text-reward-text">
                        <Crown size={12} aria-hidden="true" /> Mastered
                      </span>
                    )}
                  </div>
                  <p lang="fr" className="text-[30px] font-semibold leading-tight tracking-[-0.01em] text-ink">{currentDrill.french}</p>
                  <p className="text-[14px] text-ink-subtle">/{currentDrill.ipa}/</p>
                  <Button variant="secondary" size="sm" onClick={() => speakFrench(currentDrill.french)}>
                    <Volume2 size={16} aria-hidden="true" /> Listen to native
                  </Button>
                  <p className="mt-2 flex w-full max-w-[520px] items-start gap-2 rounded-control bg-info-soft px-3 py-2.5 text-left text-[13px] text-info-text">
                    <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{currentDrill.tip}</span>
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
                    ) : screenState === 'idle' ? (
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
                        <span className="text-[14px] font-semibold text-ink">Tap to record the phrase</span>
                        <span className="text-[13px] text-ink-muted">Say it once, clearly, at a natural pace</span>
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
                          Recording · tap to stop
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
                      // results | low-confidence | offline-tier all render the same score panel;
                      // the badges/banners below express the distinction, per plan §16's
                      // "never render derived metrics as Azure scores" / "always show provider badge".
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
                              </div>
                            )}
                          </div>

                          <PronunciationSourceBadge provider={assessment.provider} />

                          {assessment.provider === 'azure' && (
                            <div className="flex flex-col gap-2 rounded-card bg-surface-recessed p-4">
                              <h3 className="text-eyebrow text-left text-ink-subtle">Word by word</h3>
                              <AccentWordMap assessment={assessment} onSpeakWord={speakFrench} />
                            </div>
                          )}

                          {assessment.phonologicalFindings && assessment.phonologicalFindings.length > 0 && (
                            <div className="flex flex-col gap-2 text-left">
                              <h3 className="text-eyebrow text-ink-subtle">Findings</h3>
                              {assessment.phonologicalFindings.map((finding, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 rounded-control border border-hairline bg-surface p-3">
                                  <span
                                    className={`shrink-0 rounded-pill px-2 py-0.5 text-caption font-semibold capitalize ${
                                      finding.provenance === 'authoritative'
                                        ? 'bg-progress-soft text-progress-text'
                                        : finding.provenance === 'derived'
                                          ? 'bg-info-soft text-info-text'
                                          : 'bg-reward-soft text-reward-text'
                                    }`}
                                  >
                                    {finding.provenance}
                                  </span>
                                  <p className="text-[13px] leading-relaxed text-ink-muted">{finding.explanation}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {assessment.coaching && (
                            <div className="flex flex-col gap-1.5 rounded-card bg-action-soft p-4 text-left">
                              <p className="text-[14px] leading-relaxed text-ink">{assessment.coaching.summary}</p>
                              <p className="text-[13px] font-semibold text-action-text">Next: {assessment.coaching.topPriority}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap justify-center gap-3">
                            <Button variant={isSuccess ? 'secondary' : 'primary'} onClick={reset}>
                              <RotateCcw size={16} aria-hidden="true" /> Try again
                            </Button>
                            {isSuccess && (
                              <Button onClick={nextDrill}>
                                Next drill <ChevronRight size={16} aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>

              {/* History strip — segmented by (assessorVersion, provider), plan §13/§16 */}
              {historySegments.length > 0 && (
                <motion.section variants={item} aria-labelledby="accent-history" className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5">
                  <h2 id="accent-history" className="text-section text-ink">Recent history</h2>
                  <div className="flex flex-col gap-3">
                    {historySegments.slice(-3).map((segment, segIdx) => (
                      <div key={segIdx} className="flex flex-col gap-1.5">
                        <span className="flex items-center gap-2 text-caption text-ink-subtle">
                          {segment.provider === 'azure' ? 'Azure' : 'Estimated'} · {segment.assessorVersion}
                          {segIdx > 0 && <WifiOff size={12} aria-hidden="true" />}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {segment.attempts.slice(-20).map(attempt => (
                            <span
                              key={attempt.id}
                              title={attempt.score !== null ? `${Math.round(attempt.score)}` : 'Could not assess'}
                              className={`h-6 w-2 rounded-pill ${
                                attempt.score === null
                                  ? 'bg-track'
                                  : attempt.score >= PRACTICE_PASS_SCORE
                                    ? 'bg-progress'
                                    : attempt.score >= 50
                                      ? 'bg-reward'
                                      : 'bg-correction'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>
          </div>
        )}
      </PageShell>
    </>
  );
}
