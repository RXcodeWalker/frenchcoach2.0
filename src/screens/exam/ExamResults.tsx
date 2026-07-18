import { motion } from 'framer-motion';
import { Trophy, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import type { EnvelopeView, CriterionView } from '../../domain/igcse/envelope/envelopeView';
import { downloadConductLog } from '../../services/exam/conductLogStore';

interface Props {
  transcript: SessionTranscript;
  envelopeView: EnvelopeView | null;
  scoringError: string | null;
  onRetryScoring: () => void;
  onRetake: () => void;
  onHome: () => void;
}

function criterionLabel(criterion: CriterionView): string {
  if (criterion.criterion === 'rolePlayTask') return `Role-Play${criterion.taskId ? ` (${criterion.taskId})` : ''}`;
  if (criterion.criterion === 'communication') return 'Communication';
  return 'Quality of Language';
}

export function ExamResults({ transcript, envelopeView, scoringError, onRetryScoring, onRetake, onHome }: Props) {
  const candidateUtterances = transcript.utterances.filter((u) => u.role === 'candidate');
  const totalSpeakingS = candidateUtterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);

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
            <h2 className="text-2xl font-black text-white mb-1">Practice Session Complete</h2>
            <p className="font-bold text-sm mb-4 text-slate-400">Component 3: Speaking (practice, not a grade prediction)</p>

            <div className="flex items-center justify-center gap-6 mb-2">
              <div className="text-center">
                <div className="text-3xl font-black text-white">{candidateUtterances.length}</div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Answers Given</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-black text-white">{Math.round(totalSpeakingS)}s</div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Speaking Time</p>
              </div>
              {envelopeView && (
                <>
                  <div className="w-px h-12 bg-white/10" />
                  <div className="text-center">
                    <div className="text-3xl font-black text-amber-400">{envelopeView.total}<span className="text-sm text-slate-500">/40</span></div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Marks</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {scoringError && (
          <div className="rounded-xl glass p-5 border border-red-500/20 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-400 text-[11px] uppercase tracking-wider mb-1">Scoring failed</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{scoringError}</p>
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
          <div className="rounded-xl glass p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-1">Marks — Unvalidated Estimate</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                This score has never been checked against a real examiner (calibration: {envelopeView.versions.calibrationVersion}). Treat it as a rough signal, not a grade prediction.
              </p>
            </div>

            <div className="space-y-3">
              {envelopeView.criteria.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white">{criterionLabel(c)}</span>
                    <span className="text-sm font-black text-amber-400">
                      {c.mark}{c.band ? <span className="text-slate-500 text-[10px] font-medium"> ({c.band.label ?? `${c.band.min}-${c.band.max}`})</span> : null}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{c.justification}</p>
                  {c.evidenceSpans.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {c.evidenceSpans.map((span, j) => (
                        <p key={j} className="text-[10px] text-slate-500 italic">"{span.quote}"</p>
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
                  <p key={i} className="text-[10px] text-slate-400">{t.id}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl glass p-5">
          <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-3">Transcript Saved</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your session transcript has been saved locally.
          </p>
        </div>

        {import.meta.env.DEV && (
          <button
            onClick={() => downloadConductLog(transcript.sessionId)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl glass-subtle text-slate-400 hover:text-white text-[11px] font-semibold transition-colors"
          >
            <Download size={13} /> Download session log (JSON)
          </button>
        )}

        <div className="flex gap-2">
          <motion.button onClick={onRetake} className="flex-1 py-3 rounded-xl glass-subtle text-white font-bold text-xs" whileTap={{ scale: 0.97 }}>New Mock Exam</motion.button>
          <motion.button onClick={onHome} className="flex-1 btn-primary py-3 rounded-xl font-bold text-xs" whileTap={{ scale: 0.97 }}>Dashboard</motion.button>
        </div>
      </motion.div>
    </div>
  );
}
