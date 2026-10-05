/**
 * Exam-mode pronunciation analysis — who sees the UI (exam-pronunciation plan
 * §2, "Release gate: calibration first").
 *
 * The thresholds behind the report are UNVALIDATED until the Batch 7
 * calibration passes, so the surfaces render only for an admin, or for
 * everyone once the build sets `VITE_EXAM_PRONUNCIATION_PUBLIC=1`. This is a
 * convenience gate only: the backend's `EXAM_PRONUNCIATION_ACCESS`
 * (off | admin | all) stays authoritative and answers 403 `not_enabled` to
 * anyone else, which the client surfaces as the `not_enabled` state.
 *
 * A `pending` (under-13, guardian not yet confirmed) account never sees it:
 * the exam gives that account no audio in the first place.
 */

export interface ExamPronunciationAccessInput {
  isAdmin: boolean;
  /** `profiles.consent_status`, or 'unknown' / null before it loads. */
  consentStatus: string | null | undefined;
  /** `VITE_EXAM_PRONUNCIATION_PUBLIC` as built; injectable for tests. */
  publicFlag?: string;
}

export function examPronunciationUiEnabled({
  isAdmin,
  consentStatus,
  publicFlag = import.meta.env.VITE_EXAM_PRONUNCIATION_PUBLIC as string | undefined,
}: ExamPronunciationAccessInput): boolean {
  if (consentStatus === 'pending') return false;
  return isAdmin || publicFlag === '1';
}
