import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { localDay } from '../lib/localDay';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  GraduationCap, School, BookOpen, Globe, MessageCircle,
  Target, MessageSquare, Sparkles, ArrowLeft, ArrowRight, CalendarClock, AlertCircle, Check, Sprout,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/auth/TextField';
import { EASE } from '../components/motion/variants';
import {
  getCoachProfile, setActiveGoal, setExamDate, getActiveGoal, updateCoachProfile,
} from '../services/coach/coachProfileService';
import { invalidateDailyPlan } from '../services/coach/decisionEngine';
import { isSafeReturnTo } from '../utils/routeSafety';
import { useApp } from '../context/AppContext';
import { JUNIOR_TRACK_SELECTABLE } from '../config/launchScope';
import type { CoachGoalType } from '../types/coach';
import { track } from '../services/telemetry/telemetryService';

type WizardStep = 1 | 2 | 3;
type ExamBoard = 'igcse' | 'gcse' | 'a_level' | 'delf' | 'none';
type GoalIntent = 'exam_prep' | 'conversational' | 'casual';

const STEP_NAMES = { 1: 'exam_board', 2: 'exam_date', 3: 'goal_intent' } as const;

// The `enter` family at wizard scale: a short rise, a plain fade under reduced motion.
const STEP_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE } },
};
const STEP_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const BOARDS: { value: ExamBoard; label: string; sub: string; Icon: typeof GraduationCap }[] = [
  { value: 'igcse', label: 'IGCSE', sub: 'Cambridge IGCSE French', Icon: GraduationCap },
  { value: 'gcse', label: 'GCSE', sub: 'UK GCSE French', Icon: School },
  { value: 'a_level', label: 'A-Level', sub: 'A-Level French', Icon: BookOpen },
  { value: 'delf', label: 'DELF / DALF', sub: 'French certification', Icon: Globe },
  { value: 'none', label: 'Just learning', sub: 'No exam planned', Icon: MessageCircle },
];

const INTENTS: { value: GoalIntent; label: string; sub: string; Icon: typeof Target }[] = [
  { value: 'exam_prep', label: 'Exam preparation', sub: 'Targeted practice for my exam', Icon: Target },
  { value: 'conversational', label: 'Conversational fluency', sub: 'Speak naturally and confidently', Icon: MessageSquare },
  { value: 'casual', label: 'Casual learning', sub: 'Explore French at my own pace', Icon: Sparkles },
];

function goalTypeToWizard(type: CoachGoalType): { examBoard: ExamBoard; goalIntent: GoalIntent } {
  switch (type) {
    case 'igcse': return { examBoard: 'igcse', goalIntent: 'exam_prep' };
    case 'gcse': return { examBoard: 'gcse', goalIntent: 'exam_prep' };
    case 'delf': return { examBoard: 'delf', goalIntent: 'exam_prep' };
    case 'conversation_fluency':
    case 'travel':
    case 'business': return { examBoard: 'none', goalIntent: 'conversational' };
    default: return { examBoard: 'none', goalIntent: 'casual' };
  }
}

export function Onboarding() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('from') === 'profile';
  const rawReturnTo = searchParams.get('returnTo');
  const destination = isSafeReturnTo(rawReturnTo) ? rawReturnTo : '/';
  const placementUrl = `/onboarding/placement?returnTo=${encodeURIComponent(destination)}`;

  const [step, setStep] = useState<WizardStep>(1);
  const [examBoard, setExamBoard] = useState<ExamBoard | null>(null);
  const [examDate, setExamDateLocal] = useState('');
  const [goalIntent, setGoalIntent] = useState<GoalIntent | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pastDateWarning, setPastDateWarning] = useState(false);

  const [initialGoalType, setInitialGoalType] = useState<CoachGoalType | null>(null);
  const [initialExamDate, setInitialExamDate] = useState('');

  useEffect(() => {
    if (!isEditMode) return;
    const profile = getCoachProfile();
    const activeGoal = getActiveGoal(profile);

    if (activeGoal) {
      const { examBoard: board, goalIntent: intent } = goalTypeToWizard(activeGoal.type);
      setExamBoard(board);
      setGoalIntent(intent);
      setInitialGoalType(activeGoal.type);
    }

    if (profile.examDate) {
      const isPast = new Date(profile.examDate) < new Date();
      if (isPast) {
        setPastDateWarning(true);
      } else {
        const iso = profile.examDate.slice(0, 10);
        setExamDateLocal(iso);
        setInitialExamDate(iso);
      }
    }
  }, [isEditMode]);

  // First-run onboarding only; editing goals from Profile is not onboarding.
  useEffect(() => {
    if (!isEditMode) track({ name: 'onboarding_step_viewed', props: { step: STEP_NAMES[step] } });
  }, [step, isEditMode]);

  const today = localDay();

  function advance() {
    if (step === 1) {
      if (examBoard === 'none') {
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
    }
  }

  function back() {
    if (step === 3 && examBoard === 'none') setStep(1);
    else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  function computeGoalType(): CoachGoalType {
    if (goalIntent === 'conversational') return 'conversation_fluency';
    if (goalIntent === 'casual') return 'general_speaking';
    if (examBoard === 'gcse') return 'gcse';
    if (examBoard === 'delf') return 'delf';
    return 'igcse';
  }

  // Same end state as manually picking "Just learning" then "Casual learning"
  // on steps 1 and 3 — a one-click shortcut through the already-supported
  // no-exam / casual path, not a new "no goal" state.
  function skipSurvey() {
    track({ name: 'onboarding_completed', props: { skipped: true, goal_type: 'general_speaking', learner_track: 'exam' } });
    setActiveGoal('general_speaking', undefined);
    if (initialExamDate) {
      updateCoachProfile({ examDate: undefined });
    }
    invalidateDailyPlan();
    navigate(destination, { replace: true });
  }

  // Junior (Grades 4–7): the exam-goal wizard does not apply, so this takes the
  // same end state as skipping it, then switches the learner track.
  function chooseJunior() {
    track({ name: 'onboarding_completed', props: { skipped: false, goal_type: 'general_speaking', learner_track: 'junior' } });
    setActiveGoal('general_speaking', undefined);
    invalidateDailyPlan();
    dispatch({ type: 'SET_LEARNER_TRACK', track: 'junior' });
    navigate('/junior', { replace: true });
  }

  function handleComplete() {
    const newGoalType = computeGoalType();
    const goalChanged = newGoalType !== initialGoalType;
    const dateChanged = examDate !== initialExamDate;
    const hasChanges = goalChanged || dateChanged;

    if (isEditMode && hasChanges && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    if (!isEditMode) track({ name: 'onboarding_completed', props: { skipped: false, goal_type: newGoalType, learner_track: 'exam' } });
    setActiveGoal(newGoalType, examDate ? { targetDate: examDate } : undefined);

    if (examDate) {
      setExamDate(examDate);
    } else if (dateChanged && initialExamDate) {
      updateCoachProfile({ examDate: undefined });
    }

    if (hasChanges || !isEditMode) {
      invalidateDailyPlan();
    }

    navigate(isEditMode ? '/profile' : placementUrl, { replace: true });
  }

  const canProceedStep1 = examBoard !== null;
  const canProceedStep3 = goalIntent !== null;

  const reduced = useReducedMotion();
  const stepProps = reduced ? STEP_VARIANTS_REDUCED : STEP_VARIANTS;
  // "Just learning" has no exam, so it skips the date step.
  const sequence: WizardStep[] = examBoard === 'none' ? [1, 3] : [1, 2, 3];
  const position = Math.max(1, sequence.indexOf(step) + 1);

  const daysToExam = examDate
    ? Math.round((new Date(`${examDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)
    : null;

  return (
    <div className="min-h-screen bg-bg px-4 pb-12 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-[520px]">
        <header className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-eyebrow uppercase text-action-text">
              {isEditMode ? 'Update goals' : 'Set up'} · Step {position} of {sequence.length}
            </p>
            {isEditMode && (
              <Button variant="quiet" size="sm" className="-mr-2" onClick={() => navigate('/profile', { replace: true })}>
                Cancel
              </Button>
            )}
          </div>
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={1}
            aria-valuemax={sequence.length}
            aria-valuenow={position}
          >
            {sequence.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-pill transition-colors duration-slide ease-slide ${
                  i < position ? 'bg-action' : 'bg-track'
                }`}
              />
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section key="step1" {...stepProps} aria-labelledby="ob-h1">
              <StepHeading id="ob-h1" title="What are you studying for?" subtitle="Your coach will personalise every session around your goal." />
              <div role="radiogroup" aria-labelledby="ob-h1" className="grid gap-2.5">
                {BOARDS.map(({ value, label, sub, Icon }) => (
                  <OptionCard
                    key={value}
                    selected={examBoard === value}
                    onSelect={() => setExamBoard(value)}
                    Icon={Icon}
                    label={label}
                    sub={sub}
                  />
                ))}
              </div>

              {!isEditMode && JUNIOR_TRACK_SELECTABLE && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="mt-4 w-full"
                  onClick={chooseJunior}
                  data-testid="onboarding-junior"
                >
                  <Sprout size={18} aria-hidden="true" /> I'm in Grades 4–7 (Junior)
                </Button>
              )}

              <WizardFooter
                left={
                  !isEditMode && (
                    <Button variant="quiet" onClick={skipSurvey}>
                      Skip for now
                    </Button>
                  )
                }
              >
                <Button size="lg" onClick={advance} disabled={!canProceedStep1} className="w-full sm:w-auto sm:min-w-[140px]">
                  Next <ArrowRight size={18} aria-hidden="true" />
                </Button>
              </WizardFooter>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section key="step2" {...stepProps} aria-labelledby="ob-h2">
              <StepHeading id="ob-h2" title="When is your exam?" subtitle="Your coach will ramp up intensity as the date approaches." />

              {pastDateWarning && (
                <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-control border border-reward bg-reward-soft p-3 text-body-s text-reward-text">
                  <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                  Your previous exam date has passed — please choose a new date or skip.
                </div>
              )}

              <div className="surface rounded-card p-4">
                <TextField
                  label="Exam date"
                  type="date"
                  min={today}
                  value={examDate}
                  onChange={e => setExamDateLocal(e.target.value)}
                />
                {daysToExam !== null && daysToExam >= 0 && (
                  <p className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-pill bg-info-soft px-3 text-label text-info-text">
                    <CalendarClock size={16} aria-hidden="true" />
                    {daysToExam === 0 ? 'Today' : daysToExam === 1 ? '1 day to go' : `${daysToExam} days to go`}
                  </p>
                )}
              </div>

              <WizardFooter
                left={
                  <Button variant="quiet" onClick={back}>
                    <ArrowLeft size={18} aria-hidden="true" /> Back
                  </Button>
                }
              >
                <Button variant="quiet" onClick={() => { setExamDateLocal(''); advance(); }}>
                  Skip — I'll add it later
                </Button>
                <Button size="lg" onClick={advance} disabled={!examDate} className="w-full sm:w-auto sm:min-w-[140px]">
                  Next <ArrowRight size={18} aria-hidden="true" />
                </Button>
              </WizardFooter>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section key="step3" {...stepProps} aria-labelledby="ob-h3">
              <StepHeading id="ob-h3" title="What's your main goal?" subtitle="This shapes how your coach designs each session." />
              <div role="radiogroup" aria-labelledby="ob-h3" className="grid gap-2.5">
                {INTENTS.map(({ value, label, sub, Icon }) => (
                  <OptionCard
                    key={value}
                    selected={goalIntent === value}
                    onSelect={() => setGoalIntent(value)}
                    Icon={Icon}
                    label={label}
                    sub={sub}
                  />
                ))}
              </div>

              <WizardFooter
                left={
                  <Button variant="quiet" onClick={back}>
                    <ArrowLeft size={18} aria-hidden="true" /> Back
                  </Button>
                }
              >
                <Button size="lg" onClick={handleComplete} disabled={!canProceedStep3} className="w-full sm:w-auto sm:min-w-[140px]">
                  {isEditMode ? 'Save changes' : 'Get Started'}
                </Button>
              </WizardFooter>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation dialog (edit mode only) */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Update learning goals?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleComplete}>
              Update goals
            </Button>
          </>
        }
      >
        <p className="text-body-s text-ink-muted">Your coach recommendations will be regenerated to reflect your changes.</p>
      </Modal>
    </div>
  );
}

function StepHeading({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 id={id} className="text-title text-ink sm:text-h2">{title}</h1>
      <p className="mt-2 text-body-base text-ink-muted">{subtitle}</p>
    </div>
  );
}

/** Back / skip on the left, the one primary on the right; stacked with the primary first on a phone. */
function WizardFooter({ left, children }: { left?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex">{left}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">{children}</div>
    </div>
  );
}

/** One choice in a radio group: a selected card is a 1px --action border on --action-soft, nothing thicker. */
function OptionCard({
  selected, onSelect, Icon, label, sub,
}: {
  selected: boolean;
  onSelect: () => void;
  Icon: typeof Target;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3.5 rounded-card border p-4 text-left
        transition-[background-color,border-color,transform] duration-state ease-smooth
        active:scale-[.97] active:duration-press ${
          selected
            ? 'border-action bg-action-soft'
            : 'border-hairline bg-surface hover:border-hairline-strong'
        }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control transition-colors duration-state ease-smooth ${
          selected ? 'bg-action text-action-ink' : 'bg-surface-recessed text-ink-muted'
        }`}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        <span className="block text-body-s text-ink-muted">{sub}</span>
      </span>
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border transition-colors duration-state ease-smooth ${
          selected ? 'border-action bg-action text-action-ink' : 'border-hairline-strong'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}
