import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Download, AlertTriangle, RefreshCw, ChevronDown, GraduationCap } from 'lucide-react';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import type { EnvelopeView, CriterionView, EvidenceGroupView } from '../../domain/igcse/envelope/envelopeView';
import { downloadConductLog } from '../../services/exam/conductLogStore';
import { ExaminerFeedbackCard } from '../../features/feedback/components/ExaminerFeedbackCard';
import type { RailEntry } from '../../services/exam/turnFeedback';
import { countsTowardProgress } from '../../services/exam/attemptStatus';

interface Props {
  transcript: SessionTranscript;
  envelopeView: EnvelopeView | null;
  scoringError: string | null;
  onRetryScoring: () => void;
  onRetake: () => void;
  onHome: () => void;
  /** W5/W6: which mode this session ran in — drives the mode badge and the rail section below. */
  coached: boolean;
  /** W6: the accumulated live-corrections-rail entries gathered during the running session (empty in Exam Sim, or if the session predates W3/W6). */
  railEntries: RailEntry[];
}

function criterionLabel(criterion: CriterionView): string {
  if (criterion.criterion === 'rolePlayTask') return `Role-Play${criterion.taskId ? ` (${criterion.taskId})` : ''}`;
  if (criterion.criterion === 'communication') return 'Communication';
  return 'Quality of Language';
}

/** Step 6: each criterion's mark denominator — role-play tasks are /2, the other two are /15. */
function criterionMax(criterion: CriterionView): number {
  return criterion.criterion === 'rolePlayTask' ? 2 : 15;
}

const PART_LABEL: Record<EvidenceGroupView['part'], string> = {
  rolePlay: 'Role Play',
  topic1: 'Topic 1',
  topic2: 'Topic 2',
};

const GUARDRAIL_LABEL: Record<string, string> = {
  insufficient_evidence_duration: 'Not enough spoken evidence to fully justify this mark — treat it as provisional.',
  quote_verification_failed: 'A quoted piece of evidence could not be verified against your transcript.',
};

function guardrailLabel(id: string): string {
  return GUARDRAIL_LABEL[id] ?? id;
}

/** Collapsible section — same disclosure pattern the "Transcript Saved" block already used. */
function Disclosure({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl surface p-5">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <div className="text-left">
          <h3 className="font-bold text-ink-muted text-[10px] uppercase tracking-wider mb-1">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-muted leading-relaxed">{subtitle}</p>}
        </div>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2.5 pt-3 border-t border-white/5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExamResults({
  transcript,
  envelopeView,
  scoringError,
  onRetryScoring,
  onRetake,
  onHome,
  coached,
  railEntries,
}: Props) {
  const candidateUtterances = transcript.utterances.filter((u) => u.role === 'candidate');
  const totalSpeakingS = candidateUtterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // Step 5 / ADR-0007: same check ExamMode used to set Session.practiceOnly —
  // recomputed here (not read off the saved session) so this banner is
  // correct even before ADD_SESSION's side effects have run.
  const attemptStatus = countsTowardProgress({ coached, transcript });
  const modeBadgeLabel = `${coached ? 'Coached Practice' : 'Exam Sim'}${
    attemptStatus.countsTowardProgress ? '' : ' — doesn’t count'
  }`;

  const rolePlaySubtotal = envelopeView
    ? envelopeView.criteria.filter((c) => c.criterion === 'rolePlayTask').reduce((sum, c) => sum + c.mark, 0)
    : 0;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-2xl surface-raised border-amber-500/15 p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/3 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 text-ink-muted border border-white/10">
                {modeBadgeLabel}
              </span>
              {envelopeView && envelopeView.typedTurnCount > 0 && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 text-ink-muted border border-white/10">
                  {envelopeView.typedTurnCount} typed answer{envelopeView.typedTurnCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <Trophy size={36} className="mx-auto text-amber-400 mb-3" style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.4))' }} />
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-1">Practice Session Complete</h2>
            <p className="font-bold text-sm mb-4 text-ink-muted">Component 3: Speaking (practice, not a grade prediction)</p>

            <div className="flex items-center justify-center gap-6 mb-2">
              <div className="text-center">
                <div className="text-3xl font-black text-white">{candidateUtterances.length}</div>
                <p className="text-[10px] text-ink-muted uppercase tracking-widest font-bold">Answers Given</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-black text-white">{Math.round(totalSpeakingS)}s</div>
                <p className="text-[10px] text-ink-muted uppercase tracking-widest font-bold">Speaking Time</p>
              </div>
              {envelopeView && (
                <>
                  <div className="w-px h-12 bg-white/10" />
                  <div className="text-center">
                    <div className="text-3xl font-black text-amber-400">{envelopeView.total}<span className="text-sm text-ink-muted">/40</span></div>
                    <p className="text-[10px] text-ink-muted uppercase tracking-widest font-bold">Marks</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {!attemptStatus.countsTowardProgress && (
          <div className="rounded-xl surface p-4 border border-amber-500/25 bg-amber-500/5 space-y-1.5">
            <p className="font-bold text-amber-400 text-[11px] uppercase tracking-wider">Practice mark — doesn&rsquo;t count</p>
            {attemptStatus.reasons.map((reason, i) => (
              <p key={i} className="text-[11px] text-ink-muted leading-relaxed">{reason}</p>
            ))}
          </div>
        )}

        {scoringError && (
          <div className="rounded-xl surface p-5 border border-red-500/20 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-400 text-[11px] uppercase tracking-wider mb-1">Scoring failed</h3>
                <p className="text-[11px] text-ink-muted leading-relaxed">{scoringError}</p>
              </div>
            </div>
            <motion.button
              onClick={onRetryScoring}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/15 text-[11px] font-bold transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              <RefreshCw size={13} /> Retry Scoring
            </motion.button>
          </div>
        )}

        {envelopeView && (
          <div className="rounded-xl surface p-5 space-y-4">
            <div>
              <h3 className="font-bold text-ink-muted text-[10px] uppercase tracking-wider mb-1">Marks — Unvalidated Estimate</h3>
              <p className="text-[10px] text-ink-muted leading-relaxed">
                This score has never been checked against a real examiner (calibration: {envelopeView.versions.calibrationVersion}). Treat it as a rough signal, not a grade prediction.
              </p>
            </div>

            <div className="space-y-3">
              {envelopeView.criteria.some((c) => c.criterion === 'rolePlayTask') && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Role play</span>
                  <span className="text-[11px] font-bold text-white">{rolePlaySubtotal}/10</span>
                </div>
              )}
              {envelopeView.criteria.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white">{criterionLabel(c)}</span>
                    <span className="text-sm font-black text-amber-400">
                      {c.mark}<span className="text-ink-muted text-[10px] font-medium">/{criterionMax(c)}</span>
                      {c.band ? <span className="text-ink-muted text-[10px] font-medium"> ({c.band.label ?? `${c.band.min}-${c.band.max}`})</span> : null}
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-muted leading-relaxed">{c.justification}</p>
                  {c.evidenceSpans.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {c.evidenceSpans.map((span, j) => (
                        <p key={j} className="text-[10px] text-ink-muted italic">"{span.quote}"</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {envelopeView.guardrailTriggers.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Guardrail Flags</span>
                </div>
                {envelopeView.guardrailTriggers.map((t, i) => (
                  <p key={i} className="text-[10px] text-ink-muted">{guardrailLabel(t.id)}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {envelopeView && envelopeView.evidenceGroups.length > 0 && (
          <Disclosure title="Turn-by-Turn Breakdown" subtitle="What each answer actually showed the scorer.">
            {envelopeView.evidenceGroups.map((g, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
                <p className="text-[9px] text-ink-subtle uppercase tracking-wider">
                  {PART_LABEL[g.part]} &middot; {g.questionOrTaskId}
                </p>
                <p className="text-[10px] text-ink-subtle italic leading-relaxed">{g.prompt}</p>
                <p className="text-[11px] text-ink-muted leading-relaxed">{g.candidateResponse}</p>
                {g.wordCount !== undefined && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[9px] text-ink-subtle">{g.wordCount} words</span>
                  </div>
                )}
              </div>
            ))}
          </Disclosure>
        )}

        {coached && railEntries.length > 0 && (
          <Disclosure
            title="Live Corrections From This Session"
            subtitle="Examiner commentary shown to you turn-by-turn while you practiced — collapsed here for reference."
          >
            <div className="flex items-center gap-1.5 mb-1">
              <GraduationCap size={12} className="text-amber-400" />
              <span className="text-[9px] text-ink-muted">Practice feedback — not a grade prediction</span>
            </div>
            {railEntries.map((entry) => (
              <ExaminerFeedbackCard
                key={entry.turnKey}
                status={entry.status}
                result={entry.result}
                onRetry={() => {}}
                onSwitchToCoach={() => {}}
                hideSwitchToCoach
              />
            ))}
          </Disclosure>
        )}

        {envelopeView && (
          <Disclosure title="How This Was Scored" subtitle="Transcript confidence and model provenance for this attempt.">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="text-[9px] text-ink-subtle uppercase tracking-wider mb-0.5">Transcript confidence</p>
                {transcript.stt.provider === 'session-engine' ? (
                  <p className="text-[11px] text-ink-muted">Not measured</p>
                ) : (
                  <>
                    <p className="text-[11px] text-ink-muted">
                      {(envelopeView.transcriptConfidence.meanWordConfidence * 100).toFixed(0)}% mean word confidence
                    </p>
                    <p className="text-[10px] text-ink-subtle mt-0.5">
                      {envelopeView.transcriptConfidence.lowConfidenceSpanCount} low-confidence span{envelopeView.transcriptConfidence.lowConfidenceSpanCount === 1 ? '' : 's'}
                      {envelopeView.transcriptConfidence.userCorrected ? ' · you corrected this transcript' : ''}
                    </p>
                  </>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="text-[9px] text-ink-subtle uppercase tracking-wider mb-0.5">Judgement model</p>
                <p className="text-[11px] text-ink-muted">{envelopeView.llm.provider} &middot; {envelopeView.llm.model}</p>
                <p className="text-[10px] text-ink-subtle mt-0.5">rubric {envelopeView.versions.rubricVersion} &middot; engine {envelopeView.versions.scoringEngineVersion}</p>
              </div>
            </div>
          </Disclosure>
        )}

        <div className="rounded-xl surface p-5">
          <button
            onClick={() => setTranscriptOpen((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="text-left">
              <h3 className="font-bold text-ink-muted text-[10px] uppercase tracking-wider mb-1">Transcript Saved</h3>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Your session transcript has been saved locally.
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`flex-shrink-0 text-ink-muted transition-transform ${transcriptOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {transcriptOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2.5 pt-3 border-t border-white/5">
                  {candidateUtterances.map((u, i) => (
                    <div key={u.utteranceId} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <p className="text-[9px] text-ink-subtle uppercase tracking-wider mb-1">{u.part} &middot; Answer {i + 1}</p>
                      <p className="text-[11px] text-ink-muted leading-relaxed">{u.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {import.meta.env.DEV && (
          <button
            onClick={() => downloadConductLog(transcript.sessionId)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl surface-recessed text-ink-muted hover:text-white text-[11px] font-semibold transition-colors"
          >
            <Download size={13} /> Download session log (JSON)
          </button>
        )}

        <div className="flex gap-2">
          <motion.button onClick={onRetake} className="flex-1 py-3 rounded-xl surface-recessed text-white font-bold text-xs" whileTap={{ scale: 0.97 }}>New Mock Exam</motion.button>
          <motion.button onClick={onHome} className="flex-1 btn-primary py-3 rounded-xl font-bold text-xs" whileTap={{ scale: 0.97 }}>Dashboard</motion.button>
        </div>
      </motion.div>
    </div>
  );
}
