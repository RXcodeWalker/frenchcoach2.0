/**
 * logStage(traceId, stage, fn): true no-op unless SCORING_DEBUG=1 or --debug
 * was passed to enableScoringDebug(). Emits one JSON line per stage to
 * stderr: {traceId, stage, durationMs, ok}. Lives under scripts/scoring/, not
 * under src/domain/igcse/, so pure domain layers are never touched.
 *
 * Pure passthrough: `try { return await fn() } finally { log }`, no catch —
 * preserves scoreAttempt.ts's documented "errors propagate unchanged"
 * contract that batchScore.ts's per-session try/catch relies on.
 */

let debugEnabled = process.env.SCORING_DEBUG === '1';

/** Call once from a CLI's arg parsing to turn on debug logging via --debug, independent of the env var. */
export function enableScoringDebug(): void {
  debugEnabled = true;
}

export function isScoringDebugEnabled(): boolean {
  return debugEnabled;
}

interface StageLogLine {
  traceId: string;
  stage: string;
  durationMs: number;
  ok: boolean;
}

export async function logStage<T>(traceId: string, stage: string, fn: () => Promise<T>): Promise<T> {
  if (!debugEnabled) return fn();

  const startedAt = Date.now();
  let ok = true;
  try {
    return await fn();
  } catch (err) {
    ok = false;
    throw err;
  } finally {
    const line: StageLogLine = { traceId, stage, durationMs: Date.now() - startedAt, ok };
    process.stderr.write(JSON.stringify(line) + '\n');
  }
}
