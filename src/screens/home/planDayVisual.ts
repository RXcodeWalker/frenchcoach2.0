import { ClipboardCheck, Feather, Flag, MessagesSquare, RotateCcw, Target, Wrench, type LucideIcon } from 'lucide-react';
import type { PlanDayKind } from '../../services/coach/weekPlan';

/** Icon and role-token colours per kind. Colour only ever pairs with an icon and a label. */
export const PLAN_DAY_VISUAL: Record<PlanDayKind, { icon: LucideIcon; chip: string; name: string }> = {
  exam_day: { icon: Flag, chip: 'bg-action-soft text-action-text', name: 'Exam day' },
  exam_sim: { icon: ClipboardCheck, chip: 'bg-action-soft text-action-text', name: 'Exam Sim' },
  coached_exam: { icon: ClipboardCheck, chip: 'bg-action-soft text-action-text', name: 'Coached exam' },
  follow_up: { icon: Wrench, chip: 'bg-reward-soft text-reward-text', name: 'Fix what the Exam Sim showed' },
  learn: { icon: Target, chip: 'bg-surface-recessed text-ink-muted', name: 'Learn' },
  review: { icon: RotateCcw, chip: 'bg-info-soft text-info-text', name: 'Review' },
  role_play: { icon: MessagesSquare, chip: 'bg-progress-soft text-progress-text', name: 'Role plays' },
  light: { icon: Feather, chip: 'bg-surface-recessed text-ink-muted', name: 'Light day' },
};
