import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileText,
  GraduationCap,
  MessagesSquare,
  NotebookPen,
  RefreshCw,
  Scale,
  Sparkles,
} from 'lucide-react';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import type { EnvelopeView, CriterionView } from '../../domain/igcse/envelope/envelopeView';
import { downloadConductLog } from '../../services/exam/conductLogStore';
import { ExaminerFeedbackCard } from '../../features/feedback/components/ExaminerFeedbackCard';
import type { RailEntry } from '../../services/exam/turnFeedback';
import { countsTowardProgress } from '../../services/exam/attemptStatus';
import { requestExamFeedback, ScoringApiError } from '../../services/exam/scoringApiClient';
import { captureError, track } from '../../services/telemetry/telemetryService';
import { markPracticeEntry } from '../../services/telemetry/practiceEntry';
import type { ExamFeedbackReport } from '../../domain/examFeedback/types';
import { displayRespell } from '../../domain/examFeedback/shared/displayRespell';
import { summariseRecognition } from '../../domain/igcse/stt/quality/summariseRecognition';
import { ExamCriterionFeedback, MistakeList } from './ExamCriterionFeedback';
import { RecognitionNotice } from './RecognitionNotice';
import { ExamPronunciationSection } from '../../features/exam/pronunciation/ExamPronunciationSection';
import type { UseExamPronunciation } from '../../features/exam/pronunciation/useExamPronunciation';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { DUR, EASE, enter, enterReduced, slide, stagger } from '../../components/motion/variants';
import { ExamResultHero } from '../../features/exam/report/ExamResultHero';
import { ExamPracticePlan } from '../../features/exam/report/ExamPracticePlan';
import { ExamAnswers } from '../../features/exam/report/ExamAnswers';
import {
  answersByPart,
  changeSince,
  examFacts,
  practicePlan,
  taskLabel,
  type PracticeItem,
  type PracticeRoute,
  type PreviousExam,
} from '../../features/exam/report/examReport';

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
  /** D3 (Batch 3): the candidate used the Exam Sim "Start now" escape hatch — same practice-only treatment as a typed answer. */
  earlyStart?: boolean;
  /** D15 (Batch 3): the attempt was resumed after a reload — same practice-only treatment. */
  resumed?: boolean;
  /** Phase 3 Batch A: fetches the post-marking report. Injected for tests; defaults to the scoring service. */
  requestFeedback?: (sessionId: string) => Promise<ExamFeedbackReport>;
  /** The report arrived (read-only: the coach keeps why marks were lost; nothing here changes a mark). */
  onReportReady?: (view: EnvelopeView, report: ExamFeedbackReport) => void;
  /**
   * Exam-pronunciation Batch 6: the opt-in pronunciation section (feedback
   * only, never a mark). Owned by ExamMode so a Coached part card's result is
   * still here. Omitted (or `enabled: false`) renders nothing.
   */
  pronunciation?: UseExamPronunciation;
  /**
   * The newest counted Exam Sim before this one, read from the stored history
   * (ExamMode). Shown only when this attempt counts too — a Coached mark is
   * never compared with a counted one (ADR 0007).
   */
  previousExam?: PreviousExam | null;
  /** Opens a practice screen from "What to practise next". Without it the plan has no buttons. */
  onPractise?: (to: PracticeRoute) => void;
}

type FeedbackState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; report: ExamFeedbackReport }
  | { status: 'failed'; limitReached: boolean };

type Tab = 'report' | 'answers' | 'details';

const GUARDRAIL_LABEL: Record<string, string> = {
  insufficient_evidence_duration: 'Not enough spoken evidence to fully justify this mark — treat it as provisional.',
  quote_verification_failed: 'A quoted piece of evidence could not be verified against your transcript.',
};

function guardrailLabel(id: string): string {
  return GUARDRAIL_LABEL[id] ?? id;
}

/** A collapsible card for the Details tab. */
function Disclosure({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof FileText;
  children: ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-card border border-hairline bg-surface p-4">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control surface-recessed text-ink-muted" aria-hidden="true">
          <Icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-section text-ink">{title}</span>
          {subtitle && <span className="mt-0.5 block text-caption text-ink-muted">{subtitle}</span>}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={slide} className="text-ink-subtle" aria-hidden="true">
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? DUR.reduced : DUR.slide, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2.5 border-t border-hairline pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Two filled dots per credited role-play mark. */
function TaskDots({ mark }: { mark: number }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {[0, 1].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-pill ${i < mark ? 'bg-progress' : 'bg-track'}`} />
      ))}
    </span>
  );
}

function Evidence({ criterion }: { criterion: CriterionView }) {
  if (criterion.evidenceSpans.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {criterion.evidenceSpans.map((span, j) => (
        <li key={j} className="rounded-control surface-recessed px-2.5 py-1.5 text-body-s text-ink-muted">
          &ldquo;{span.quote}&rdquo;
        </li>
      ))}
    </ul>
  );
}

/** Where every mark came from: each role-play task, then Communication and Quality of Language. */
function MarksCard({ view, report }: { view: EnvelopeView; report: ExamFeedbackReport | null }) {
  const reduced = useReducedMotion() ?? false;
  const tasks = view.criteria.filter((c) => c.criterion === 'rolePlayTask');
  const others = view.criteria.filter((c) => c.criterion !== 'rolePlayTask');
  const rolePlaySubtotal = tasks.reduce((sum, c) => sum + c.mark, 0);
  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      data-testid="exam-marks"
      aria-label="Your marks"
      className="rounded-card border border-hairline bg-surface p-4 space-y-4"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-reward-soft text-reward-text" aria-hidden="true">
          <Scale size={18} />
        </span>
        <div>
          <h3 className="text-section text-ink">Your marks</h3>
          <p className="text-caption text-ink-muted">An unvalidated estimate: why each mark was given.</p>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-eyebrow uppercase text-ink-subtle">Role play</span>
            <span className="font-numeral text-label text-ink">{rolePlaySubtotal}/10</span>
          </div>
          <ul className="space-y-2">
            {tasks.map((c) => {
              const task = report?.rolePlay.tasks.find((t) => t.taskId === c.taskId);
              return (
                <li key={c.taskId} className="rounded-control surface-recessed p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-label text-ink">{taskLabel(c.taskId ?? '')}</span>
                    <TaskDots mark={c.mark} />
                    <span className="ml-auto font-numeral text-label text-ink">
                      {c.mark}
                      <span className="text-ink-subtle">/2</span>
                    </span>
                  </div>
                  {task?.reason ? (
                    <div data-testid="rp-reason" className="mt-1.5 space-y-1">
                      <p className="text-body-s text-ink">{task.reason}</p>
                      {task.error && <MistakeList mistakes={[task.error]} />}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-body-s text-ink-muted">{c.justification}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {others.map((c) => (
        <div key={c.criterion} className="rounded-control surface-recessed p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-label text-ink">{c.criterion === 'communication' ? 'Communication' : 'Quality of Language'}</span>
            <span className="font-numeral text-label text-ink">
              {c.mark}
              <span className="text-ink-subtle">/15</span>
              {c.band ? <span className="ml-1 text-caption text-ink-subtle">({c.band.label ?? `${c.band.min}-${c.band.max}`})</span> : null}
            </span>
          </div>
          <p className="mt-1.5 text-body-s text-ink-muted">{c.justification}</p>
          <Evidence criterion={c} />
        </div>
      ))}

      {view.guardrailTriggers.length > 0 && (
        <div className="space-y-1 rounded-control border border-hairline bg-reward-soft p-3">
          <p className="flex items-center gap-1.5 text-eyebrow uppercase text-reward-text">
            <AlertTriangle size={13} aria-hidden="true" /> Treat with care
          </p>
          {view.guardrailTriggers.map((t, i) => (
            <p key={i} className="text-body-s text-ink-muted">{guardrailLabel(t.id)}</p>
          ))}
        </div>
      )}
    </motion.section>
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
  earlyStart = false,
  resumed = false,
  requestFeedback = requestExamFeedback,
  onReportReady,
  pronunciation,
  previousExam = null,
  onPractise,
}: Props) {
  const reduced = useReducedMotion() ?? false;
  const candidateUtterances = transcript.utterances.filter((u) => u.role === 'candidate');
  const recognition = summariseRecognition(transcript);
  const facts = useMemo(() => examFacts(transcript), [transcript]);
  const [tab, setTab] = useState<Tab>('report');

  // Step 5 / ADR-0007: same check ExamMode used to set Session.practiceOnly —
  // recomputed here (not read off the saved session) so this banner is
  // correct even before ADD_SESSION's side effects have run. earlyStart/resumed
  // (Batch 3, D3/D15) are passed through from ExamMode's own refs, since
  // neither is recoverable from the transcript alone.
  const attemptStatus = countsTowardProgress({ coached, transcript, earlyStart, resumed });
  const modeBadgeLabel = `${coached ? 'Coached Practice' : 'Exam Sim'}${
    attemptStatus.countsTowardProgress ? '' : ' — doesn’t count'
  }`;

  // Phase 3 Batch A: the report is requested only once marks exist, and the
  // marks above render first and never wait on it — it cannot change them.
  const sessionIdForFeedback = envelopeView?.sessionId ?? null;
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle' });
  const loadFeedback = useCallback(
    (sessionId: string, isCurrent: () => boolean = () => true) => {
      setFeedback({ status: 'pending' });
      requestFeedback(sessionId).then(
        (report) => {
          if (isCurrent()) setFeedback({ status: 'ready', report });
        },
        (err: unknown) => {
          captureError(err, { area: 'exam_report', stage: 'requestExamFeedback', sessionId });
          if (isCurrent()) {
            setFeedback({ status: 'failed', limitReached: err instanceof ScoringApiError && err.status === 429 });
          }
        },
      );
    },
    [requestFeedback],
  );
  useEffect(() => {
    if (!sessionIdForFeedback) return;
    let current = true;
    loadFeedback(sessionIdForFeedback, () => current);
    return () => {
      current = false;
    };
  }, [sessionIdForFeedback, loadFeedback]);
  const feedbackReport = feedback.status === 'ready' ? feedback.report : null;
  useEffect(() => {
    if (feedbackReport && envelopeView) onReportReady?.(envelopeView, feedbackReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per arriving report
  }, [feedbackReport]);
  const envelopeQolErrors = envelopeView?.criteria.find((c) => c.criterion === 'qualityOfLanguage')?.errors ?? [];

  const plan = useMemo(() => (envelopeView ? practicePlan(envelopeView, feedbackReport) : []), [envelopeView, feedbackReport]);
  const answerParts = useMemo(() => (envelopeView ? answersByPart(envelopeView, feedbackReport) : []), [envelopeView, feedbackReport]);
  const answerCount = answerParts.reduce((sum, p) => sum + p.rows.length, 0);
  const compareWith = attemptStatus.countsTowardProgress ? previousExam : null;

  // Analytics (enums and counts only — never an answer, quote or feedback
  // text): one view per mount, plus one more if a failed marking is retried
  // into a score, so "report seen" and "plan tapped" share a denominator.
  const mode = coached ? 'coached' : 'sim';
  const viewedRef = useRef<Set<boolean>>(new Set());
  useEffect(() => {
    const hasScore = envelopeView !== null;
    if (viewedRef.current.has(hasScore)) return;
    viewedRef.current.add(hasScore);
    const change = envelopeView && compareWith ? changeSince(envelopeView, compareWith).total : null;
    track({
      name: 'exam_report_viewed',
      props: {
        has_score: hasScore,
        mode,
        counts_toward_progress: attemptStatus.countsTowardProgress,
        total_score: envelopeView?.total ?? null,
        plan_items: plan.length,
        compared: change !== null,
        change_total: change,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per scored/unscored state
  }, [envelopeView !== null]);

  const changeTab = (next: Tab) => {
    if (next !== tab) track({ name: 'exam_report_tab', props: { tab: next } });
    setTab(next);
  };

  const practise = (item: PracticeItem, rank: number) => {
    const destination = item.action.to === '/exam/role-play' ? 'role_play' : 'learn';
    track({
      name: 'exam_plan_action',
      props: {
        area: item.area,
        rank,
        plan_items: plan.length,
        marks_lost: item.lost,
        destination,
        next_step_shown: item.nextStep !== null,
        mode,
        counts_toward_progress: attemptStatus.countsTowardProgress,
      },
    });
    markPracticeEntry(destination, item.area);
    onPractise?.(item.action.to);
  };

  const detailsBody = (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3" data-testid="exam-details">
      {coached && railEntries.length > 0 && (
        <Disclosure
          icon={GraduationCap}
          title="Live corrections from this session"
          subtitle="The examiner's commentary after each answer, kept here for reference."
        >
          <p className="text-caption text-ink-subtle">Practice feedback — not a grade prediction</p>
          {railEntries.map((entry) => (
            <ExaminerFeedbackCard
              key={entry.turnKey}
              status={entry.status}
              result={entry.result}
              failureKind={entry.failureKind}
              shortAnswer={entry.shortAnswer}
              onRetry={() => {}}
              onSwitchToCoach={() => {}}
              hideSwitchToCoach
              variant="compact"
            />
          ))}
        </Disclosure>
      )}

      {envelopeView && (
        <Disclosure icon={Scale} title="How this was scored" subtitle="Transcript confidence and the marking model used.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-control surface-recessed p-3">
              <p className="text-eyebrow uppercase text-ink-subtle">Transcript confidence</p>
              {transcript.stt.provider === 'session-engine' ? (
                <p className="mt-1 text-body-s text-ink-muted">Not measured</p>
              ) : (
                <>
                  <p className="mt-1 text-body-s text-ink-muted">
                    {(envelopeView.transcriptConfidence.meanWordConfidence * 100).toFixed(0)}% mean word confidence
                  </p>
                  <p className="mt-0.5 text-caption text-ink-subtle">
                    {envelopeView.transcriptConfidence.lowConfidenceSpanCount} low-confidence span
                    {envelopeView.transcriptConfidence.lowConfidenceSpanCount === 1 ? '' : 's'}
                    {envelopeView.transcriptConfidence.userCorrected ? ' · you corrected this transcript' : ''}
                  </p>
                </>
              )}
            </div>
            <div className="rounded-control surface-recessed p-3">
              <p className="text-eyebrow uppercase text-ink-subtle">Marking model</p>
              <p className="mt-1 text-body-s text-ink-muted">{envelopeView.llm.provider} &middot; {envelopeView.llm.model}</p>
              <p className="mt-0.5 text-caption text-ink-subtle">
                rubric {envelopeView.versions.rubricVersion} &middot; engine {envelopeView.versions.scoringEngineVersion} &middot; calibration{' '}
                {envelopeView.versions.calibrationVersion}
              </p>
            </div>
          </div>
        </Disclosure>
      )}

      {/* With marks, "Your answers" already shows every answer; without them the transcript is the only copy. */}
      {!envelopeView && (
        <Disclosure icon={FileText} title="Your transcript" subtitle="Saved on this device.">
          {candidateUtterances.map((u, i) => (
            <div key={u.utteranceId} className="rounded-control surface-recessed p-3">
              <p className="mb-1 text-eyebrow uppercase text-ink-subtle">
                {u.part} &middot; Answer {i + 1}
              </p>
              <p className="text-body-s text-ink">{displayRespell(u)}</p>
            </div>
          ))}
        </Disclosure>
      )}

      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => downloadConductLog(transcript.sessionId)}
          className="flex w-full items-center justify-center gap-2 rounded-control surface-recessed py-2.5 text-label text-ink-muted transition-colors duration-state hover:text-ink"
        >
          <Download size={14} /> Download session log (JSON)
        </button>
      )}
    </motion.div>
  );

  const feedbackSection = envelopeView && feedback.status !== 'idle' && (
    <motion.section
      variants={reduced ? enterReduced : enter}
      data-testid="exam-feedback"
      aria-label="Examiner feedback"
      className="space-y-3"
    >
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
          <NotebookPen size={18} />
        </span>
        <div>
          <h3 className="text-section text-ink">Examiner feedback</h3>
          <p className="text-caption text-ink-muted">Written after marking. It never changes your marks.</p>
        </div>
      </div>

      {feedback.status === 'pending' && (
        <div className="space-y-2 rounded-card border border-hairline bg-surface p-4" role="status">
          <p className="flex items-center gap-2 text-body-s text-ink">
            <Sparkles size={15} className="text-action-text" aria-hidden="true" />
            Writing your feedback…
          </p>
          <p className="text-caption text-ink-muted">Your marks are final; this adds what worked and what to fix in each part.</p>
        </div>
      )}

      {feedback.status === 'failed' && (
        <div className="space-y-3 rounded-card border border-hairline bg-surface p-4">
          <p className="text-body-s text-ink-muted">
            {feedback.limitReached
              ? 'You have reached today’s limit for exam feedback. Your marks above are unaffected.'
              : 'Your feedback could not be written this time. Your marks above are unaffected.'}
          </p>
          {envelopeQolErrors.length > 0 && (
            <div className="space-y-2">
              <p className="text-eyebrow uppercase text-correction-text">Mistakes</p>
              <MistakeList mistakes={envelopeQolErrors} />
            </div>
          )}
          {!feedback.limitReached && sessionIdForFeedback && (
            <Button variant="secondary" size="sm" className="w-full" onClick={() => loadFeedback(sessionIdForFeedback)}>
              <RefreshCw size={14} /> Retry feedback
            </Button>
          )}
        </div>
      )}

      {feedbackReport && (
        <div className="space-y-3">
          <ExamCriterionFeedback
            title="Role play"
            area="rolePlay"
            strengths={feedbackReport.rolePlay.strengths}
            nextStep={feedbackReport.rolePlay.nextStep}
          />
          <ExamCriterionFeedback
            title="Communication"
            area="communication"
            strengths={feedbackReport.communication.strengths}
            nextStep={feedbackReport.communication.nextStep}
          />
          <ExamCriterionFeedback
            title="Quality of Language"
            area="qualityOfLanguage"
            strengths={feedbackReport.qualityOfLanguage.strengths}
            mistakes={feedbackReport.qualityOfLanguage.errors}
            soundAlikeNotes={feedbackReport.qualityOfLanguage.soundAlikeNotes}
            nextStep={feedbackReport.qualityOfLanguage.nextStep}
          />
        </div>
      )}
    </motion.section>
  );

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-10">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-2xl space-y-4 px-4 pt-6 md:px-6 md:pt-8"
      >
        <ExamResultHero view={envelopeView} facts={facts} modeLabel={modeBadgeLabel} coached={coached} previous={compareWith} />

        {!attemptStatus.countsTowardProgress && (
          <motion.div variants={reduced ? enterReduced : enter} className="space-y-1 rounded-card border border-hairline bg-reward-soft p-4">
            <p className="text-label text-reward-text">Practice mark — doesn&rsquo;t count</p>
            {attemptStatus.reasons.map((reason, i) => (
              <p key={i} className="text-body-s text-ink-muted">{reason}</p>
            ))}
          </motion.div>
        )}

        <RecognitionNotice summary={recognition} when="results" />

        {scoringError && (
          <div className="space-y-3 rounded-card border border-hairline bg-correction-soft p-4" role="alert">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-correction-text" aria-hidden="true" />
              <div>
                <h2 className="text-section text-correction-text">Scoring failed</h2>
                <p className="mt-0.5 text-body-s text-ink-muted">{scoringError}</p>
                <p className="mt-1 text-caption text-ink-subtle">Your answers are saved, so you can try again.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="w-full" onClick={onRetryScoring}>
              <RefreshCw size={14} /> Retry Scoring
            </Button>
          </div>
        )}

        {envelopeView && (
          <ExamPracticePlan items={plan} reportPending={feedback.status === 'pending'} onPractise={onPractise ? practise : undefined} />
        )}

        {envelopeView ? (
          <>
            <div className="sticky top-0 z-10 -mx-1 bg-bg px-1 py-1">
              <Segmented<Tab>
                label="Report sections"
                value={tab}
                onChange={changeTab}
                testIdPrefix="exam-tab"
                options={[
                  { id: 'report', label: 'Report' },
                  { id: 'answers', label: `Your answers${answerCount ? ` (${answerCount})` : ''}` },
                  { id: 'details', label: 'Details' },
                ]}
              />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? DUR.reduced : DUR.state, ease: EASE }}
              >
                {tab === 'report' && (
                  <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
                    <MarksCard view={envelopeView} report={feedbackReport} />
                    {feedbackSection}
                    {/* Exam-pronunciation Batch 6: after the marks and the examiner report, never inside either. */}
                    {pronunciation?.enabled && <ExamPronunciationSection pronunciation={pronunciation} />}
                  </motion.div>
                )}
                {tab === 'answers' &&
                  (answerParts.length > 0 ? (
                    <ExamAnswers parts={answerParts} />
                  ) : (
                    <div className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4">
                      <MessagesSquare size={18} className="text-ink-subtle" aria-hidden="true" />
                      <p className="text-body-s text-ink-muted">No answers reached the marker.</p>
                    </div>
                  ))}
                {tab === 'details' && detailsBody}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          detailsBody
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onRetake}>
            New mock exam
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={onHome}>
            Done
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
