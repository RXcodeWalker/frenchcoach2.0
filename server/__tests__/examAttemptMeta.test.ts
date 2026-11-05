import { describe, expect, it, vi } from 'vitest';
import {
  assignmentExamKey,
  homeworkExamAllowed,
  parseAssignmentId,
  parseAttemptMetaParams,
  serverCountsTowardProgress,
} from '../examAttemptMeta';
import type { SessionTranscript } from '../../src/domain/igcse/stt/types';

const ASG = '6f1c1d0e-3b0a-4c39-9d43-6a6f3a0e2b11';

function transcript(over: Partial<SessionTranscript> = {}, typed = false): SessionTranscript {
  return {
    userCorrected: false,
    utterances: [
      { role: 'examiner', text: 'Bonjour' },
      { role: 'candidate', text: 'Bonjour', ...(typed ? { inputMode: 'text' } : { inputMode: 'speech' }) },
    ],
    ...over,
  } as unknown as SessionTranscript;
}

describe('attempt meta params', () => {
  it('parses mode, counts and a canonical assignment id; unknown mode is the safe side', () => {
    expect(parseAttemptMetaParams({ mode: 'examSim', counts: '1', assignment: ASG.toUpperCase() })).toEqual({ conductMode: 'examSim', countsClaimed: true, assignmentId: ASG });
    expect(parseAttemptMetaParams({})).toEqual({ conductMode: 'coached', countsClaimed: false, assignmentId: null });
    expect(parseAssignmentId("x' or 1=1")).toBeNull();
  });

  it('the server only ever lowers the client claim', () => {
    const sim = { conductMode: 'examSim' as const, countsClaimed: true, assignmentId: null };
    expect(serverCountsTowardProgress(sim, transcript())).toBe(true);
    expect(serverCountsTowardProgress({ ...sim, countsClaimed: false }, transcript())).toBe(false);
    expect(serverCountsTowardProgress({ ...sim, conductMode: 'coached' }, transcript())).toBe(false);
    expect(serverCountsTowardProgress(sim, transcript({}, true))).toBe(false);
    expect(serverCountsTowardProgress(sim, transcript({ userCorrected: true }))).toBe(false);
  });
});

describe('homeworkExamAllowed', () => {
  it('asks the RPC with the homework key and accepts only an assignment_exam yes', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ok: true, feature: 'assignment_exam' }, error: null });
    expect(await homeworkExamAllowed({ rpc } as never, 'u1', ASG, 'sess-1')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('assignment_allowance', { p_user_id: 'u1', p_assignment_id: ASG, p_exclude_key: assignmentExamKey(ASG, 'sess-1') });
  });

  it('falls back to the normal rules on anything else', async () => {
    const no = vi.fn().mockResolvedValue({ data: { ok: false, reason: 'used_up' }, error: null });
    const wrong = vi.fn().mockResolvedValue({ data: { ok: true, feature: 'assignment_learn_answer' }, error: null });
    const broken = vi.fn().mockResolvedValue({ data: null, error: { message: 'down' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await homeworkExamAllowed({ rpc: no } as never, 'u1', ASG, 's')).toBe(false);
    expect(await homeworkExamAllowed({ rpc: wrong } as never, 'u1', ASG, 's')).toBe(false);
    expect(await homeworkExamAllowed({ rpc: broken } as never, 'u1', ASG, 's')).toBe(false);
    expect(await homeworkExamAllowed({ rpc: no } as never, 'u1', null, 's')).toBe(false);
    spy.mockRestore();
  });
});
