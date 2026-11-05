/**
 * Whether the exam guide (`/exam/guide`) opens by itself before an Exam Sim.
 *
 * It does once: for a learner who has neither opened the guide nor finished an
 * exam on this account. Opening the guide (from the chooser or automatically)
 * marks it seen, so skipping it straight away still counts — it never comes back.
 * Local, per account, nothing else reads it.
 */
import { STORAGE_KEYS, storageGet, storageSet } from '../../services/persistence/storage';
import { getSessionHistory } from '../../services/analytics/analyticsService';

export function hasSeenExamGuide(): boolean {
  return storageGet<boolean>(STORAGE_KEYS.examGuideSeen, false) === true;
}

export function markExamGuideSeen(): void {
  storageSet(STORAGE_KEYS.examGuideSeen, true);
}

/** True before a learner's first Exam Sim, unless they've already seen the guide or done an exam. */
export function shouldOpenGuideBeforeSim(): boolean {
  if (hasSeenExamGuide()) return false;
  return !getSessionHistory().some((s) => s.mode === 'exam');
}

/** `location.state` the guide is opened with when it stands between the learner and an Exam Sim. */
export interface ExamGuideLocationState {
  thenSim?: boolean;
}

/** `location.state` that sends the exam route straight to the Exam Sim intro. */
export interface StartSimLocationState {
  startSim?: boolean;
}
