/**
 * The Pronunciation Lab's daily allowance (plan Stage 7, owner D3: 30 checked
 * takes per account per day; backend `pronunciation_lab`) is used up.
 *
 * `/api/pronunciation` answers a Lab take (source=lab, scripted) over the cap
 * with 429 {"detail": {"error": "daily_quota_reached"}} — or, for a signed-out
 * guest, "guest_limit_reached". The provider raises LabAllowanceError for those
 * two codes only, so a slowapi rate limit (a plain 429) still reads as an
 * ordinary failed check. Screens map it to a "come back tomorrow" notice, never
 * to a retry: the cap does not lift until the UTC day rolls over.
 */
export class LabAllowanceError extends Error {
  constructor(readonly limit?: number) {
    super('lab_daily_limit');
    this.name = 'LabAllowanceError';
  }
}

export function isLabAllowanceError(err: unknown): err is LabAllowanceError {
  return err instanceof LabAllowanceError;
}

const ALLOWANCE_CODES = new Set(['daily_quota_reached', 'guest_limit_reached']);

/** The error for a 429 body when it is the Lab allowance's, else null. */
export function labAllowanceFromBody(body: unknown): LabAllowanceError | null {
  if (!body || typeof body !== 'object') return null;
  const detail = (body as { detail?: unknown }).detail;
  if (!detail || typeof detail !== 'object') return null;
  const { error, limit } = detail as { error?: unknown; limit?: unknown };
  if (typeof error !== 'string' || !ALLOWANCE_CODES.has(error)) return null;
  return new LabAllowanceError(typeof limit === 'number' ? limit : undefined);
}
