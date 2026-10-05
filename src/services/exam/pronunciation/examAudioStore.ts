/**
 * Exam-mode pronunciation analysis — the in-memory home of each candidate
 * turn's recording: `Map<sessionId, Map<turnKey, Blob>>`.
 *
 * Browser memory only, by design (plan §5 privacy, Decision 2): raw audio is
 * never written to localStorage, IndexedDB, the running-session snapshot, or
 * Supabase Storage. A blob lives until the first of:
 *   - the candidate leaves the results (ExamMode unmounts → `clearExamAudio`),
 *   - a new attempt starts or the candidate retakes (`clearExamAudio`),
 *   - sign-out (`clearAllExamAudio`, called from AuthContext),
 *   - the tab closing (it is just memory), or
 *   - 60 minutes without being read or written (`IDLE_TTL_MS`).
 * Reopening a stored report later therefore shows the analysis but no "You"
 * playback ("recording not kept").
 *
 * `turnKey` is the candidate ConductLog entry's `seq` — the corrections rail's
 * key — see src/domain/examPronunciation/segment.ts.
 *
 * Nothing here touches the network, the scored pipeline, or any mark.
 */

/** A session untouched for this long is dropped. */
export const IDLE_TTL_MS = 60 * 60 * 1000;

interface SessionAudio {
  turns: Map<number, Blob>;
  lastTouchedAt: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

const sessions = new Map<string, SessionAudio>();

function dropSession(sessionId: string): void {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  if (entry.idleTimer !== null) clearTimeout(entry.idleTimer);
  sessions.delete(sessionId);
}

function arm(sessionId: string, entry: SessionAudio): void {
  if (entry.idleTimer !== null) clearTimeout(entry.idleTimer);
  entry.lastTouchedAt = Date.now();
  entry.idleTimer = setTimeout(() => dropSession(sessionId), IDLE_TTL_MS);
}

/** Returns the live record, or undefined — dropping it first if it has gone idle (a background tab can delay the timer). */
function live(sessionId: string): SessionAudio | undefined {
  const entry = sessions.get(sessionId);
  if (!entry) return undefined;
  if (Date.now() - entry.lastTouchedAt >= IDLE_TTL_MS) {
    dropSession(sessionId);
    return undefined;
  }
  return entry;
}

/** Stores one turn's recording. An empty blob is "no audio" and is not stored. Replaces any earlier blob for the same turn. */
export function putTurnAudio(sessionId: string, turnKey: number, blob: Blob | null | undefined): void {
  if (!sessionId || !blob || blob.size === 0) return;
  let entry = live(sessionId);
  if (!entry) {
    entry = { turns: new Map(), lastTouchedAt: Date.now(), idleTimer: null };
    sessions.set(sessionId, entry);
  }
  entry.turns.set(turnKey, blob);
  arm(sessionId, entry);
}

export function getTurnAudio(sessionId: string, turnKey: number): Blob | undefined {
  const entry = live(sessionId);
  if (!entry) return undefined;
  arm(sessionId, entry);
  return entry.turns.get(turnKey);
}

/** Turn keys that have a recording, ascending. */
export function getTurnAudioKeys(sessionId: string): number[] {
  const entry = live(sessionId);
  if (!entry) return [];
  arm(sessionId, entry);
  return [...entry.turns.keys()].sort((a, b) => a - b);
}

/** Forgets one session's recordings. Safe to call for an unknown or empty id. */
export function clearExamAudio(sessionId: string): void {
  if (!sessionId) return;
  dropSession(sessionId);
}

/** Forgets every session's recordings (sign-out). */
export function clearAllExamAudio(): void {
  for (const id of [...sessions.keys()]) dropSession(id);
}
