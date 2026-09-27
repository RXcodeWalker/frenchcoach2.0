import { describe, it, expect, vi } from 'vitest';
import {
  combineAssessment,
  scoreQualityOfLanguage,
  scoreRolePlayAndCommunication,
  scoreSpeaking,
  ProvenanceError,
  JudgementValidationError,
  assertRedistributable,
} from '../scoreSpeaking';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import type { Judge, JudgeRequest, JudgeResponse } from '../types';
import { buildValidMainOutput, buildValidQolOutput, fakeJudgeFor, PRACTICE_TRANSCRIPT } from './fixtures';

const EVIDENCE = buildEvidenceProfile(PRACTICE_TRANSCRIPT);

function fakeJudge(main: unknown = buildValidMainOutput(), qol: unknown = buildValidQolOutput()) {
  return vi.fn(fakeJudgeFor(main, qol));
}

describe('scoreSpeaking', () => {
  it('happy path: returns typed assessment with derived totals', async () => {
    const judge = fakeJudge();
    const result = await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);

    expect(result.rolePlay.total).toBe(9);
    expect(result.total).toBe(25);
    expect(result.communication.mark).toBe(8);
    expect(result.qualityOfLanguage.mark).toBe(8);
    expect(judge).toHaveBeenCalledTimes(2);
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
    const judge = fakeJudge();
    const confidentialTranscript = {
      ...PRACTICE_TRANSCRIPT,
      contentProvenance: 'confidential-internal' as const,
    };

    const result = await scoreSpeaking(confidentialTranscript, EVIDENCE, judge);
    expect(result.total).toBe(25);
    expect(judge).toHaveBeenCalledTimes(2);
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

  it('accepts a reply wrapped in one ```json fence', async () => {
    const judge: Judge = async (req) => ({
      raw: '```json\n' + JSON.stringify(req.kind === 'qualityOfLanguage' ? buildValidQolOutput() : buildValidMainOutput()) + '\n```',
    });
    const result = await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);
    expect(result.total).toBe(25);
  });

  it('accepts a reply wrapped in a bare ``` fence with surrounding whitespace', async () => {
    const judge: Judge = async (req) => ({
      raw: '  \n```\n' + JSON.stringify(req.kind === 'qualityOfLanguage' ? buildValidQolOutput() : buildValidMainOutput()) + '\n```  \n',
    });
    const result = await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);
    expect(result.total).toBe(25);
  });

  it('still rejects prose around a fenced reply (only a whole-reply fence is stripped)', async () => {
    const judge: Judge = async (req) => ({
      raw: 'Here is the JSON:\n```json\n' + JSON.stringify(req.kind === 'qualityOfLanguage' ? buildValidQolOutput() : buildValidMainOutput()) + '\n```',
    });
    await expect(scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge)).rejects.toThrow(JudgementValidationError);
  });

  it('rejects judge output failing validation (near-miss accent quote)', async () => {
    const output = buildValidMainOutput();
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
    const output = buildValidMainOutput();
    output.rolePlay.tasks[1].evidenceSpans = [{ source: 'rolePlay', quote: 'deux croissants' }];
    const judge = fakeJudge(output);

    const result = await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);
    expect(result.rolePlay.total).toBe(9);
  });

  it('accepts near-miss judge output (straight apostrophe vs curly transcript)', async () => {
    const output = buildValidMainOutput();
    output.communication.evidenceSpans = [
      { source: 'topic1', quote: "j'ai joué au football" },
      { source: 'topic2', quote: 'Mon meilleur ami' },
    ];
    const judge = fakeJudge(output);

    const result = await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);
    expect(result.total).toBe(25);
  });

  it('seam purity: scoreSpeaking performs no network I/O (judge is injected)', async () => {
    const judge = fakeJudge();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network'));

    await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('sends each call its own kind and prompt: Tables A+B to the main call, Table C to the QoL call', async () => {
    const captured: JudgeRequest[] = [];
    const inner = fakeJudgeFor();
    const judge: Judge = async (req: JudgeRequest): Promise<JudgeResponse> => {
      captured.push(req);
      return inner(req);
    };

    await scoreSpeaking(PRACTICE_TRANSCRIPT, EVIDENCE, judge);

    const main = captured.find((r) => r.kind === 'rolePlayCommunication')!;
    const qol = captured.find((r) => r.kind === 'qualityOfLanguage')!;
    expect(captured).toHaveLength(2);
    expect(main.prompt).toContain('Table A');
    expect(main.prompt).toContain('Table B');
    expect(main.prompt).not.toContain('Table C');
    expect(main.prompt).toContain(PRACTICE_TRANSCRIPT.rolePlay[0].candidateResponse);
    expect(qol.prompt).toContain('Table C');
    expect(qol.prompt).not.toContain('Table B');
    expect(qol.prompt).not.toContain(PRACTICE_TRANSCRIPT.rolePlay[0].candidateResponse);
  });
});

describe('scoring-prompt-v0.6 split calls', () => {
  it('scoreRolePlayAndCommunication calls only the main kind', async () => {
    const judge = fakeJudge();
    const result = await scoreRolePlayAndCommunication(PRACTICE_TRANSCRIPT, EVIDENCE, judge);
    expect(result.rolePlay.total).toBe(9);
    expect(result.communication.mark).toBe(8);
    expect(judge).toHaveBeenCalledOnce();
    expect(judge.mock.calls[0][0].kind).toBe('rolePlayCommunication');
  });

  it('scoreQualityOfLanguage calls only the QoL kind and keeps the error list', async () => {
    const judge = fakeJudge();
    const result = await scoreQualityOfLanguage(PRACTICE_TRANSCRIPT, judge);
    expect(result.mark).toBe(8);
    expect(result.errors).toHaveLength(1);
    expect(result.errorFrequency).toBe('some errors');
    expect(judge).toHaveBeenCalledOnce();
    expect(judge.mock.calls[0][0].kind).toBe('qualityOfLanguage');
  });

  it('both calls run the provenance guard before any judge call', async () => {
    const judge = fakeJudge();
    const bad = { ...PRACTICE_TRANSCRIPT, contentProvenance: 'exam-script' as 'original-practice' };
    await expect(scoreRolePlayAndCommunication(bad, EVIDENCE, judge)).rejects.toThrow(ProvenanceError);
    await expect(scoreQualityOfLanguage(bad, judge)).rejects.toThrow(ProvenanceError);
    expect(judge).not.toHaveBeenCalled();
  });

  it('a bad QoL reply fails with a JudgementValidationError naming the QoL call', async () => {
    const judge: Judge = async () => ({ raw: 'not json' });
    await expect(scoreQualityOfLanguage(PRACTICE_TRANSCRIPT, judge)).rejects.toThrow(
      /Quality of Language judge response is not valid JSON/,
    );
  });

  it('combineAssessment derives the total from both results', async () => {
    const judge = fakeJudge();
    const main = await scoreRolePlayAndCommunication(PRACTICE_TRANSCRIPT, EVIDENCE, judge);
    const qol = await scoreQualityOfLanguage(PRACTICE_TRANSCRIPT, judge);
    const combined = combineAssessment(main, qol);
    expect(combined.total).toBe(9 + 8 + 8);
    expect(combined.qualityOfLanguage.errors).toEqual(qol.errors);
  });
});
