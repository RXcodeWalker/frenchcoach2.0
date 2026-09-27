import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableScoringDebug, isScoringDebugEnabled, logJudgeParseFailureDiagnostics, logStage } from '../logger';

describe('logStage', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('is a true no-op (no log line) when debug is disabled', async () => {
    const result = await logStage('trace-1', 'stage-1', async () => 'value');
    expect(result).toBe('value');
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  // Runs here, not its own describe block below, because debugEnabled is a
  // one-way module-level ratchet in this file (see logStage's own tests) —
  // this must execute before the first enableScoringDebug() call.
  it('logJudgeParseFailureDiagnostics is a no-op when debug is disabled', () => {
    logJudgeParseFailureDiagnostics('trace-parse-1', 'session-1', 'qualityOfLanguage', 'gemini', 'gemini-2.5-flash', {
      replyLength: 42,
      looksTruncated: true,
    });
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('logs one JSON line per stage when debug is enabled', async () => {
    enableScoringDebug();
    expect(isScoringDebugEnabled()).toBe(true);

    const result = await logStage('trace-2', 'stage-2', async () => 42);
    expect(result).toBe(42);
    expect(stderrSpy).toHaveBeenCalledTimes(1);

    const line = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(line).toMatchObject({ traceId: 'trace-2', stage: 'stage-2', ok: true });
    expect(typeof line.durationMs).toBe('number');
  });

  it('propagates errors unchanged (no catch) while still logging ok:false', async () => {
    enableScoringDebug();
    const err = new Error('boom');

    await expect(
      logStage('trace-3', 'stage-3', async () => {
        throw err;
      }),
    ).rejects.toBe(err);

    const line = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(line).toMatchObject({ traceId: 'trace-3', stage: 'stage-3', ok: false });
  });

  it('logJudgeParseFailureDiagnostics logs provider/model/length/truncation, never a reply, once debug is enabled', () => {
    // Debug is already enabled by an earlier test in this file (one-way ratchet).
    expect(isScoringDebugEnabled()).toBe(true);
    logJudgeParseFailureDiagnostics('trace-parse-2', 'session-2', 'rolePlayCommunication', 'gemini', 'gemini-2.5-flash', {
      replyLength: 17,
      looksTruncated: false,
    });
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(line).toEqual({
      traceId: 'trace-parse-2',
      sessionId: 'session-2',
      stage: 'judgeParseFailureDiagnostics',
      judgeKind: 'rolePlayCommunication',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      replyLength: 17,
      looksTruncated: false,
    });
  });
});
