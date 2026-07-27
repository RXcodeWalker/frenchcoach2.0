import { describe, it, expect, vi } from 'vitest';
import {
  scoreSpeaking,
  ProvenanceError,
  JudgementValidationError,
  assertRedistributable,
} from '../scoreSpeaking';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import type { Judge, JudgeRequest, JudgeResponse } from '../types';
import { buildValidJudgeOutput, PRACTICE_TRANSCRIPT } from './fixtures';

const EVIDENCE = buildEvidenceProfile(PRACTICE_TRANSCRIPT);

function fakeJudge(output: ReturnType<typeof buildValidJudgeOutput>): Judge {
  return vi.fn(async () => ({ raw: JSON.stringify(output) }));
}

describe('scoreSpeaking', () => {
  it('happy path: returns typed assessment with derived totals', async () => {
    const judge = fakeJudge(buildValidJudgeOutput());
    const result = await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);

    expect(result.rolePlay.total).toBe(9);
    expect(result.total).toBe(25);
    expect(result.communication.mark).toBe(8);
    expect(result.qualityOfLanguage.mark).toBe(8);
    expect(judge).toHaveBeenCalledOnce();
  });

  it('provenance guard: rejects non-original-practice before judge is called', async () => {
    const judge = vi.fn(async () => ({ raw: '{}' }));
    const badTranscript = {
      ...PRACTICE_TRANSCRIPT,
      contentProvenance: 'exam-script' as 'original-practice',
    };

    await expect(scoreSpeaking(badTranscript, EVIDENCE, judge)).rejects.toThrow(ProvenanceError);
    expect(judge).not.toHaveBeenCalled();
  });

  it('provenance guard: accepts confidential-internal (scoring is not gated by redistributability)', async () => {
    const judge = fakeJudge(buildValidJudgeOutput());
    const confidentialTranscript = {
      ...PRACTICE_TRANSCRIPT,
      contentProvenance: 'confidential-internal' as const,
    };

    const result = await scoreSpeaking(confidentialTranscript, EVIDENCE, judge);
    expect(result.total).toBe(25);
    expect(judge).toHaveBeenCalledOnce();
  });

  it('assertRedistributable: throws on confidential-internal, passes on original-practice', () => {
    expect(() =>
      assertRedistributable({ ...PRACTICE_TRANSCRIPT, contentProvenance: 'confidential-internal' }),
    ).toThrow(ProvenanceError);
    expect(() => assertRedistributable(PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('rejects invalid JSON from judge', async () => {
    const judge: Judge = async () => ({ raw: 'not json' });
    await expect(scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge)).rejects.toThrow(
      JudgementValidationError,
    );
  });

  it('rejects judge output failing validation (near-miss accent quote)', async () => {
    const output = buildValidJudgeOutput();
    output.communication.evidenceSpans = [
      { source: 'topic1', quote: "j'ai joue au football" },
      { source: 'topic2', quote: 'Mon meilleur ami' },
    ];
    const judge = fakeJudge(output);

    await expect(scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge)).rejects.toThrow(
      /evidence quote not grounded/,
    );
  });

  it('accepts near-miss judge output (collapsed whitespace quote)', async () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[1].evidenceSpans = [{ source: 'rolePlay', quote: 'deux croissants' }];
    const judge = fakeJudge(output);

    const result = await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);
    expect(result.rolePlay.total).toBe(9);
  });

  it('accepts near-miss judge output (straight apostrophe vs curly transcript)', async () => {
    const output = buildValidJudgeOutput();
    output.communication.evidenceSpans = [
      { source: 'topic1', quote: "j'ai joué au football" },
      { source: 'topic2', quote: 'Mon meilleur ami' },
    ];
    const judge = fakeJudge(output);

    const result = await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);
    expect(result.total).toBe(25);
  });

  it('seam purity: scoreSpeaking performs no network I/O (judge is injected)', async () => {
    const judge = fakeJudge(buildValidJudgeOutput());
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network'));

    await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('passes a prompt containing rubric descriptors to the judge', async () => {
    let capturedPrompt = '';
    const judge: Judge = async (req: JudgeRequest): Promise<JudgeResponse> => {
      capturedPrompt = req.prompt;
      return { raw: JSON.stringify(buildValidJudgeOutput()) };
    };

    await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);

    expect(capturedPrompt).toContain('Table A');
    expect(capturedPrompt).toContain('Table B');
    expect(capturedPrompt).toContain('Table C');
    expect(capturedPrompt).toContain(PRACTICE_TRANSCRIPT.rolePlay[0].candidateResponse);
  });
});
