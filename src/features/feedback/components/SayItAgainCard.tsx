import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { Waveform } from '../../recording/Waveform';
import { useAudioBlobRecorder } from '../../recording/useAudioBlobRecorder';
import { assessPronunciation } from '../../../services/pronunciation/pronunciationClient';
import {
  PRACTICE_PASS_SCORE,
  PRACTICE_NEAR_MISS_SCORE,
  PRACTICE_MAX_ATTEMPTS,
} from '../../../domain/pronunciation/practiceThresholds';
import { track } from '../../../services/telemetry/telemetryService';
import { incrementCounter } from '../../../services/telemetry/localCounters';
import type { PronunciationAssessment } from '../../../domain/pronunciation/types';

interface Props {
  /** The corrected sentence to practice — feedback.improved_answer ?? feedback.rephrase. */
  targetSentence: string;
  questionId: string;
  onDone: () => void;
}

export type PracticeOutcome = 'pass' | 'retry' | 'advance-no-verdict' | null;

/** Pure practice-step state machine (exported for unit testing — see
 * __tests__/practiceOutcome.test.ts). Every path advances eventually: 'pass'
 * and 'advance-no-verdict' are both terminal; 'retry' is reachable only when
 * attempt < PRACTICE_MAX_ATTEMPTS, so a third attempt is never offered. */
export function outcomeFor(result: PronunciationAssessment, attempt: number): PracticeOutcome {
  if (result.provider !== 'azure') return 'advance-no-verdict';
  if (result.score >= PRACTICE_PASS_SCORE) return 'pass';
  if (attempt < PRACTICE_MAX_ATTEMPTS) return 'retry';
  return 'advance-no-verdict';
}

// Near miss (55–69) surfaces a weakest-word hint on the retry; a lower score
// still gets exactly the same one retry, just without the hint — there isn't
// enough signal that low a score to single out one word as "the" problem.
export function isNearMiss(score: number): boolean {
  return score >= PRACTICE_NEAR_MISS_SCORE && score < PRACTICE_PASS_SCORE;
}

function weakestWordOf(result: PronunciationAssessment): string | null {
  if (!result.issues || result.issues.length === 0) return null;
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...result.issues].sort((a, b) => rank[a.severity] - rank[b.severity])[0].word;
}

export function SayItAgainCard({ targetSentence, questionId, onDone }: Props) {
  const { isRecording, start, stop, waveData, micLevel } = useAudioBlobRecorder();
  const [attempt, setAttempt] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PronunciationAssessment | null>(null);
  const [outcome, setOutcome] = useState<PracticeOutcome>(null);
  // Survives handleRetry's reset — the retry UI needs the PREVIOUS attempt's
  // weakest word, from a `result` that gets cleared to drive the fresh
  // recording UI. Null unless the previous attempt was a near miss.
  const [retryHintWord, setRetryHintWord] = useState<string | null>(null);

  const trackCompleted = (
    completedOutcome: 'pass' | 'advance-no-verdict',
    provider: 'azure' | 'whisper-heuristic' | null,
    attemptsMade: number,
  ) => {
    track({
      name: 'practice_step_completed',
      props: { question_id: questionId, outcome: completedOutcome, provider, attempts: attemptsMade },
    });
    incrementCounter(
      completedOutcome === 'pass' ? 'practice_step_completed_pass' : 'practice_step_completed_advance_no_verdict',
    );
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      const captured = await stop();
      if (!captured) {
        // No recorder was active (e.g. permission denied) — advance rather
        // than trap the student on a step that can never complete.
        trackCompleted('advance-no-verdict', null, attempt);
        onDone();
        return;
      }
      setIsAnalyzing(true);
      try {
        const assessment = await assessPronunciation({
          audioBlob: captured.blob,
          targetText: targetSentence,
          source: 'learn_practice',
        });
        const nextOutcome = outcomeFor(assessment, attempt);
        setResult(assessment);
        setOutcome(nextOutcome);
        if (nextOutcome === 'pass' || nextOutcome === 'advance-no-verdict') {
          trackCompleted(nextOutcome, assessment.provider, attempt);
        }
      } catch {
        // Throw / timeout: advance, credit participation — never trap the student.
        trackCompleted('advance-no-verdict', null, attempt);
        onDone();
        return;
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setResult(null);
      setOutcome(null);
      start();
    }
  };

  const handleRetry = () => {
    incrementCounter('practice_step_completed_retry');
    setRetryHintWord(
      result && result.provider === 'azure' && isNearMiss(result.score)
        ? weakestWordOf(result)
        : null,
    );
    setAttempt(a => a + 1);
    setResult(null);
    setOutcome(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl glass-elevated p-5 space-y-4 border border-violet-500/15"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1.5">
          Say it again
        </p>
        <p className="text-sm text-white leading-relaxed">"{targetSentence}"</p>
        {attempt > 1 && retryHintWord && !outcome && (
          <p className="text-[11px] text-slate-400 mt-1.5">
            Focus on: <span className="text-violet-300 font-semibold">{retryHintWord}</span>
          </p>
        )}
      </div>

      {!outcome && (
        <>
          <Waveform isRecording={isRecording} source={micLevel} data={waveData} variant="learn" />
          <div className="flex items-center justify-center">
            <motion.button
              onClick={handleRecordToggle}
              disabled={isAnalyzing}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
                isRecording
                  ? 'bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)]'
                  : 'bg-gradient-to-br from-violet-electric to-indigo-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]'
              } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
              whileHover={{ scale: isAnalyzing ? 1 : 1.1 }}
              whileTap={{ scale: isAnalyzing ? 1 : 0.9 }}
            >
              {isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
            </motion.button>
          </div>
          <p className="text-center text-[10px] text-slate-600">
            {isAnalyzing ? 'Analysing…' : isRecording ? 'Tap to stop' : 'Tap to record'}
          </p>
        </>
      )}

      {outcome === 'pass' && result && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-[11px] text-emerald-300">Nice — that landed. Score: {Math.round(result.score)}</p>
        </div>
      )}

      {outcome === 'retry' && (
        <button
          type="button"
          onClick={handleRetry}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-bold text-xs"
        >
          <RotateCcw size={12} /> Try once more
        </button>
      )}

      {outcome === 'advance-no-verdict' && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <p className="text-[11px] text-slate-400">
            {result && result.provider === 'azure'
              ? 'Good effort — moving on.'
              : 'Recorded — no automated score available for this attempt.'}
          </p>
        </div>
      )}

      {outcome && (
        <button
          type="button"
          onClick={onDone}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl btn-primary font-bold text-sm"
        >
          Continue <ChevronRight size={13} />
        </button>
      )}
    </motion.div>
  );
}
