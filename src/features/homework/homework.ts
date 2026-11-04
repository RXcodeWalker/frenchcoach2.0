/**
 * Homework a teacher set (teacher dashboard Stage 3; docs/systems/teacher-dashboard.md §5).
 *
 * A homework link is an ordinary screen URL plus `?assignment=<uuid>`:
 *   learn_topic → /learn?topic=<key>&assignment=<id>
 *   role_play   → /exam/role-play?card=<id>&assignment=<id>
 *   mock_exam   → /exam?assignment=<id>
 *
 * The id only *asks* for homework allowance; the backend's `assignment_allowance`
 * RPC decides (membership, targeting, the per-assignment cap). A screen must look
 * the id up in the learner's own `my_assignments()` before treating it as homework,
 * so a stale or foreign id is simply ignored.
 *
 * Completion is derived, never stored: a Session carries `assignmentId`, and the
 * teacher's grid counts those rows (`domain/teacher/homework.ts`).
 */
import type { MyAssignment } from '../../services/teacher/teacherApi';
import { LEARN_TOPIC_PARAM } from '../learn/topicDeepLink';
import { isAssignmentId } from './homeworkContext';

export const HOMEWORK_PARAM = 'assignment';
export const ROLE_PLAY_CARD_PARAM = 'card';

export { isAssignmentId };

export function homeworkIdFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get(HOMEWORK_PARAM);
  return isAssignmentId(id) ? id.toLowerCase() : null;
}

export function homeworkLink(a: Pick<MyAssignment, 'id' | 'kind' | 'topicKey' | 'rolePlayCardId'>): string {
  const params = new URLSearchParams();
  if (a.kind === 'learn_topic' && a.topicKey) {
    params.set(LEARN_TOPIC_PARAM, a.topicKey);
    params.set(HOMEWORK_PARAM, a.id);
    return `/learn?${params.toString()}`;
  }
  if (a.kind === 'role_play' && a.rolePlayCardId) {
    params.set(ROLE_PLAY_CARD_PARAM, a.rolePlayCardId);
    params.set(HOMEWORK_PARAM, a.id);
    return `/exam/role-play?${params.toString()}`;
  }
  params.set(HOMEWORK_PARAM, a.id);
  return `/exam?${params.toString()}`;
}

/** "due today", "due tomorrow", "due Fri 7 Nov", "2 days late". */
export function dueLabel(dueAt: string, now: Date = new Date()): string {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return '';
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((day(due) - day(now)) / 86_400_000);
  if (due.getTime() < now.getTime()) {
    const late = Math.max(0, -diffDays);
    return late === 0 ? 'due earlier today' : late === 1 ? '1 day late' : `${late} days late`;
  }
  if (diffDays === 0) return 'due today';
  if (diffDays === 1) return 'due tomorrow';
  return `due ${due.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

/** Most answers a Learn homework can ask for: Learn builds its sessions as 'quick' (5 questions). */
export const HOMEWORK_MAX_LEARN_ANSWERS = 5;

/** A homework Learn session's length: what the teacher asked for, never more than could be built. */
export function homeworkSessionLength(questionCount: number | null, built: number): number {
  return Math.max(0, Math.min(built, questionCount ?? built, HOMEWORK_MAX_LEARN_ANSWERS));
}
