import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { MicroDrillModal } from '../components/ui/MicroDrillModal';
import { SKILL_DEFS } from '../services/coaching/diagnosticEngine';
import { hasMicroDrillForSkill } from '../services/coach/recurringGrammar';
import { getActiveProblem, recordIntervention, recordInterventionOutcome } from '../services/coach/interventionService';
import { generateRecommendation } from '../services/coach/recommendationEngine';
import { invalidateDailyPlan } from '../services/coach/decisionEngine';
import { pushLearnerSnapshot } from '../services/notifications/learnerSnapshot';
import { useApp } from '../context/AppContext';

/**
 * `/fix/:skillId` — where a "that mistake keeps coming back" nudge or the
 * weekly email's "Fix it in 60 seconds" lands (docs/systems/retention-notifications.md §3).
 * Opens the same MicroDrill Learn offers, and closes the same intervention
 * loop: the drill is recorded against the coach's active problem for that
 * skill, its outcome updates the problem, and the fresh snapshot tells the
 * server whether to stop nudging about it.
 */
export function FixDrill() {
  const { skillId = '' } = useParams();
  const navigate = useNavigate();
  const { authUser } = useApp();
  const valid = Boolean(SKILL_DEFS[skillId]) && hasMicroDrillForSkill(skillId);
  const [open, setOpen] = useState(valid);
  const interventionRef = useRef<{ id: string; problemId: string } | null>(null);

  useEffect(() => {
    if (!valid || interventionRef.current) return;
    const problem = getActiveProblem(skillId);
    if (problem) {
      const iv = recordIntervention({ problemId: problem.id, nodeId: problem.nodeId });
      interventionRef.current = { id: iv.id, problemId: problem.id };
    }
  }, [valid, skillId]);

  if (!valid) return <Navigate to="/learn" replace />;

  const handleComplete = (result: { correct: number; total: number; immediateSuccess: number }) => {
    const iv = interventionRef.current;
    if (iv) {
      recordInterventionOutcome({
        interventionId: iv.id,
        problemId: iv.problemId,
        nodeId: skillId,
        correct: result.correct,
        total: result.total,
        immediateSuccess: result.immediateSuccess,
      });
      generateRecommendation();
      invalidateDailyPlan();
    }
    if (authUser) void pushLearnerSnapshot(authUser.id);
  };

  return (
    <PageShell>
      <TopContextBar title={`Fix: ${SKILL_DEFS[skillId].name}`} subtitle={SKILL_DEFS[skillId].desc} showBack onBack={() => navigate('/learn')} />
      <AnimatePresence>
        {open && (
          <MicroDrillModal
            skillId={skillId}
            onComplete={handleComplete}
            onClose={() => { setOpen(false); navigate('/learn', { replace: true }); }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}
