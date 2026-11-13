import type { ExaminerTurnKind } from '../../../services/coaching/examinerFeedback';

/** The note a 1–3-word answer always gets (topic conversation vs role play). */
export const SHORT_ANSWER_NOTES: Record<ExaminerTurnKind, string> = {
  topic:
    'A very short answer gives the examiner little to credit. Answer in a full sentence, then add an opinion, a reason (parce que…) and an example.',
  rolePlay:
    'A short answer can complete a role-play task, but say it as a full sentence with a verb so the examiner can be sure the task is done.',
};
