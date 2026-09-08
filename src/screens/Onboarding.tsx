import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  GraduationCap, School, BookOpen, Globe, MessageCircle,
  Target, MessageSquare, Sparkles, ChevronLeft,
} from 'lucide-react';
import {
  getCoachProfile, setActiveGoal, setExamDate, getActiveGoal, updateCoachProfile,
} from '../services/coach/coachProfileService';
import { invalidateDailyPlan } from '../services/coach/decisionEngine';
import type { CoachGoalType } from '../types/coach';

type WizardStep = 1 | 2 | 3;
type ExamBoard = 'igcse' | 'gcse' | 'a_level' | 'delf' | 'none';
type GoalIntent = 'exam_prep' | 'conversational' | 'casual';

const STEP_VARIANTS = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.15 } },
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
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('from') === 'profile';

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

  const today = new Date().toISOString().slice(0, 10);

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
    setActiveGoal('general_speaking', undefined);
    if (initialExamDate) {
      updateCoachProfile({ examDate: undefined });
    }
    invalidateDailyPlan();
    navigate('/', { replace: true });
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

    setActiveGoal(newGoalType, examDate ? { targetDate: examDate } : undefined);

    if (examDate) {
      setExamDate(examDate);
    } else if (dateChanged && initialExamDate) {
      updateCoachProfile({ examDate: undefined });
    }

    if (hasChanges || !isEditMode) {
      invalidateDailyPlan();
    }

    navigate(isEditMode ? '/profile' : '/', { replace: true });
  }

  const canProceedStep1 = examBoard !== null;
  const canProceedStep3 = goalIntent !== null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {([1, 2, 3] as WizardStep[]).map(s => {
          const active = s === step;
          const done = s < step || (step === 3 && examBoard === 'none' && s === 2);
          return (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                active ? 'w-6 bg-violet-500' : done ? 'w-3 bg-violet-500/50' : 'w-3 bg-slate-700'
              }`}
            />
          );
        })}
      </div>

      <div className="w-full max-w-sm relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
              <h1 className="text-2xl font-black text-white mb-1 text-center">What are you studying for?</h1>
              <p className="text-sm text-ink-muted text-center mb-6">Your coach will personalise every session around your goal.</p>
              <div className="grid grid-cols-1 gap-2">
                {BOARDS.map(({ value, label, sub, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setExamBoard(value)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                      examBoard === value
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-700/50 bg-white/[0.02] hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      examBoard === value ? 'bg-violet-500/20' : 'bg-slate-800'
                    }`}>
                      <Icon size={16} className={examBoard === value ? 'text-violet-400' : 'text-ink-muted'} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-[10px] text-ink-subtle">{sub}</p>
                    </div>
                    {examBoard === value && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={advance}
                disabled={!canProceedStep1}
                className="mt-5 w-full py-3 rounded-xl font-bold text-sm bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-600 transition-colors"
              >
                Next
              </button>
              {!isEditMode && (
                <button
                  onClick={skipSurvey}
                  className="mt-2 w-full py-2 rounded-xl font-semibold text-xs text-ink-muted hover:text-ink-muted transition-colors"
                >
                  Skip for now
                </button>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
              <button onClick={back} className="flex items-center gap-1 text-ink-muted text-xs mb-6 hover:text-ink-muted transition-colors">
                <ChevronLeft size={14} /> Back
              </button>
              <h1 className="text-2xl font-black text-white mb-1 text-center">When is your exam?</h1>
              <p className="text-sm text-ink-muted text-center mb-6">Your coach will ramp up intensity as the date approaches.</p>

              {pastDateWarning && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
                  Your previous exam date has passed — please choose a new date or skip.
                </div>
              )}

              <div className="rounded-xl border border-slate-700/50 bg-white/[0.02] p-4">
                <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2">Exam date</label>
                <input
                  type="date"
                  min={today}
                  value={examDate}
                  onChange={e => setExamDateLocal(e.target.value)}
                  className="w-full bg-transparent text-white text-sm font-semibold focus:outline-none [color-scheme:dark]"
                />
              </div>

              <button
                onClick={advance}
                disabled={!examDate}
                className="mt-4 w-full py-3 rounded-xl font-bold text-sm bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-600 transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => { setExamDateLocal(''); advance(); }}
                className="mt-2 w-full py-2 rounded-xl font-semibold text-xs text-ink-muted hover:text-ink-muted transition-colors"
              >
                Skip — I'll add it later
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
              <button onClick={back} className="flex items-center gap-1 text-ink-muted text-xs mb-6 hover:text-ink-muted transition-colors">
                <ChevronLeft size={14} /> Back
              </button>
              <h1 className="text-2xl font-black text-white mb-1 text-center">What's your main goal?</h1>
              <p className="text-sm text-ink-muted text-center mb-6">This shapes how your coach designs each session.</p>
              <div className="grid grid-cols-1 gap-2">
                {INTENTS.map(({ value, label, sub, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setGoalIntent(value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                      goalIntent === value
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-700/50 bg-white/[0.02] hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      goalIntent === value ? 'bg-violet-500/20' : 'bg-slate-800'
                    }`}>
                      <Icon size={18} className={goalIntent === value ? 'text-violet-400' : 'text-ink-muted'} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-[10px] text-ink-subtle">{sub}</p>
                    </div>
                    {goalIntent === value && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleComplete}
                disabled={!canProceedStep3}
                className="mt-5 w-full py-3 rounded-xl font-bold text-sm bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-600 transition-colors"
              >
                {isEditMode ? 'Save changes' : 'Get Started'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation dialog (edit mode only) */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
            <motion.div
              className="relative z-10 w-full max-w-xs rounded-2xl glass-elevated border border-slate-700/50 p-5"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <h3 className="font-black text-white text-base mb-1.5">Update learning goals?</h3>
              <p className="text-[11px] text-ink-muted mb-5">Your coach recommendations will be regenerated to reflect your changes.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-xs font-semibold text-ink-muted hover:bg-white/[0.03] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-2.5 rounded-lg bg-violet-500 text-xs font-bold text-white hover:bg-violet-600 transition-colors"
                >
                  Update goals
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
