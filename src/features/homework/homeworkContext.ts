/**
 * The Learn homework request context (features/homework/homework.ts). Deliberately
 * import-free: apiClient reads it, so it must not pull in screens or data.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAssignmentId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

// ── The Learn request context ────────────────────────────────────────────────
// Learn sets this while the learner is answering the homework topic, and clears
// it when they leave it; apiClient adds `X-Assignment-Id` to auth-gated requests
// while it is set (the backend reads it only on Learn feedback). Request context,
// not app data — nothing persists it.

let activeLearnHomework: string | null = null;

export function setActiveLearnHomework(assignmentId: string | null): void {
  activeLearnHomework = isAssignmentId(assignmentId) ? assignmentId : null;
}

export function getActiveLearnHomework(): string | null {
  return activeLearnHomework;
}

export function homeworkRequestHeader(): Record<string, string> {
  return activeLearnHomework ? { 'X-Assignment-Id': activeLearnHomework } : {};
}
