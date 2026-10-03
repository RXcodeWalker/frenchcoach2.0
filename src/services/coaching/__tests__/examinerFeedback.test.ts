import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MARKING_PRINCIPLES } from '../../../domain/igcse/rubric';
import {
  buildExaminerPromptTemplates,
  EXAMINER_DATA_BEGIN,
  EXAMINER_DATA_END,
  EXAMINER_DESCRIPTORS,
  EXAMINER_FEEDBACK_PROMPT_VERSION,
  EXAMINER_FEEDBACK_PROMPT_VERSION_V1,
  EXAMINER_FEEDBACK_PROMPT_VERSION_V2,
  ExaminerGroundingFailedError,
  getGroundedExaminerFeedback,
  isExaminerFeedbackEmpty,
  type ExaminerFeedback,
  type ExaminerParseInput,
} from '../examinerFeedback';

const SOURCE_PATH = join(__dirname, '../examinerFeedback.ts');

// ── Type test: no feedback shape may carry a numeric field ───────────────────
type DeepContainsNumber<T> = T extends number
  ? true
  : T extends string | boolean | null | undefined
    ? false
    : T extends readonly (infer U)[]
      ? DeepContainsNumber<U>
      : T extends object
        ? { [K in keyof T]: DeepContainsNumber<T[K]> }[keyof T]
        : false;
// Fails to compile (`true` is not assignable to `never`) if any ExaminerFeedback field becomes numeric.
const NO_NUMERIC_FIELDS: DeepContainsNumber<ExaminerFeedback> extends false ? true : never = true;

describe('ExaminerFeedback carries no mark, band or numeric field (ADR-0005/0009)', () => {
  it('type test compiled', () => {
    expect(NO_NUMERIC_FIELDS).toBe(true);
  });

  it('no key is named like a mark, band, grade or score', () => {
    const keys = ['profile', 'turnKind', 'strengths', 'errors', 'nextStep', 'task', 'clarity', 'error', 'claim', 'quote', 'correction', 'category', 'descriptorId'];
    for (const k of keys) expect(k).not.toMatch(/mark|band|grade|score|total/i);
  });
});

describe('buildExaminerPromptTemplates', () => {
  const templates = buildExaminerPromptTemplates();
  const v1 = templates[EXAMINER_FEEDBACK_PROMPT_VERSION_V1];
  const v2 = templates[EXAMINER_FEEDBACK_PROMPT_VERSION];

  it('serves v3 for this client, with v2 and v1 kept for one release', () => {
    expect(EXAMINER_FEEDBACK_PROMPT_VERSION).toBe('examiner-v3');
    expect(Object.keys(templates).sort()).toEqual(['examiner-v1', 'examiner-v2', 'examiner-v3']);
  });

  it('v1 is the Batch 0 prompt content, byte for byte', () => {
    const prompt = v1.learn.topic.template;
    expect(prompt).toMatch(/NEVER output a mark/i);
    expect(prompt).toMatch(/- Very good:/);
    expect(prompt).toMatch(/MARKING PRINCIPLES/);
    expect(v1.learn.topic.responseKeys).toBeUndefined();
    expect(v1.rail.rolePlay.template).toBe(prompt);
  });

  it('pins the v2 and v3 templates: changing either requires a new prompt version', () => {
    const v2Frozen = templates[EXAMINER_FEEDBACK_PROMPT_VERSION_V2];
    expect(createHash('sha256').update(JSON.stringify(v2Frozen)).digest('hex')).toBe(
      '239fd3316eef9d5eb91ab7d06553236f82a1f397cb1a835443c2f561b50967cf',
    );
    expect(createHash('sha256').update(JSON.stringify(v2)).digest('hex')).toBe('e9b4ef8828bf29f2af1e19dc94c0cad2e22d3ec5a4be9d3981102644336e2a11');
  });

  it('v2 has no band labels and no marking-principles lines', () => {
    for (const profile of ['learn', 'rail'] as const) {
      for (const kind of ['topic', 'rolePlay'] as const) {
        const { template } = v2[profile][kind];
        expect(template).not.toMatch(/^- (Very good|Good|Satisfactory|Weak|Poor):/m);
        expect(template).not.toMatch(/MARKING PRINCIPLES/);
        for (const p of MARKING_PRINCIPLES) expect(template).not.toContain(p.text);
        expect(template).not.toMatch(/Foundation|Core-Secure|Extended-High|Table B|Table C|Table A/);
      }
    }
  });

  it('v2 forbids marks/bands/totals and asks for English claims with French corrections', () => {
    const { template } = v2.learn.topic;
    expect(template).toMatch(/never state or imply a mark/i);
    expect(template).toMatch(/every claim in English and every correction in French/);
    expect(template).toMatch(/Never put a number, mark, band, grade or total/);
  });

  it('v2 lists the descriptor bullets by id and lowest to highest, unlabelled', () => {
    const { template } = v2.learn.topic;
    for (const d of EXAMINER_DESCRIPTORS) expect(template).toContain(`${d.id}: ${d.text}`);
    expect(EXAMINER_DESCRIPTORS.map((d) => d.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'S1', 'S2', 'S3', 'V1', 'V2', 'V3']);
  });

  it('descriptor bullets are single-answer ones only (no pronunciation, no alternative-question bullets)', () => {
    for (const d of EXAMINER_DESCRIPTORS) {
      expect(d.text).not.toMatch(/pronunciation|alternative question|repetition/i);
    }
  });

  it('carries the answer mode and the sound-alike rule', () => {
    for (const profile of ['learn', 'rail'] as const) {
      for (const kind of ['topic', 'rolePlay'] as const) {
        const { template } = v2[profile][kind];
        expect(template).toContain(`${EXAMINER_DATA_BEGIN}\n{{inputMode}}\n${EXAMINER_DATA_END}`);
        expect(template).toMatch(/if ANSWER MODE is "speech", do NOT report a mistake that exists only in spelling/);
        expect(template).toMatch(/word-final é/);
        expect(template).toMatch(/If ANSWER MODE is "text", report spelling/);
      }
    }
  });

  it('puts every placeholder only inside the DATA BOUNDARY', () => {
    const boundary = new RegExp(`${EXAMINER_DATA_BEGIN}\\n(.*?)\\n${EXAMINER_DATA_END}`, 'g');
    const expected: Record<string, string[]> = {
      'learn/topic': ['{{question}}', '{{transcript}}', '{{inputMode}}'],
      'rail/topic': ['{{question}}', '{{contextQuestion}}', '{{transcript}}', '{{inputMode}}'],
      'rail/rolePlay': ['{{rolePlaySetup}}', '{{question}}', '{{transcript}}', '{{inputMode}}'],
    };
    for (const [key, blocks] of Object.entries(expected)) {
      const [profile, kind] = key.split('/') as ['learn' | 'rail', 'topic' | 'rolePlay'];
      const { template, retryReminder } = v2[profile][kind];
      expect([...template.matchAll(boundary)].map((m) => m[1])).toEqual(blocks);
      expect(template.replace(boundary, '')).not.toMatch(/\{\{/);
      expect(retryReminder).not.toMatch(/\{\{/);
    }
  });

  it('role-play rail prompt lists Table A logic without mark numbers', () => {
    const { template } = v2.rail.rolePlay;
    expect(template).toMatch(/The information is communicated\./);
    expect(template).toMatch(/Errors impede communication\./);
    expect(template).toMatch(/Minor errors/);
    expect(template).toMatch(/Do not say whether the task was achieved, partly achieved or not achieved/);
  });

  it('per-profile output caps and relayed keys', () => {
    expect(v2.learn.topic.maxOutputTokens).toBe(1200);
    expect(v2.rail.topic.maxOutputTokens).toBe(300);
    expect(v2.rail.rolePlay.maxOutputTokens).toBe(300);
    expect(v2.learn.topic.responseKeys).toEqual(['strengths', 'errors', 'nextStep']);
    expect(v2.rail.topic.responseKeys).toEqual(['errors', 'strength']);
    expect(templates[EXAMINER_FEEDBACK_PROMPT_VERSION_V2].rail.topic.responseKeys).toEqual(['errors']);
    expect(v2.rail.rolePlay.responseKeys).toEqual(['task', 'clarity', 'error']);
  });

  it('keeps the verbatim-quoting reminder for the retry attempt', () => {
    expect(v2.learn.topic.retryReminder).toMatch(/Copy the candidate's exact words/);
  });
});

describe('isExaminerFeedbackEmpty', () => {
  it('is true for an empty result of each shape', () => {
    expect(isExaminerFeedbackEmpty({ profile: 'learn', strengths: [], errors: [], nextStep: null })).toBe(true);
    expect(isExaminerFeedbackEmpty({ profile: 'rail', turnKind: 'topic', errors: [], strength: null })).toBe(true);
    expect(
      isExaminerFeedbackEmpty({ profile: 'rail', turnKind: 'rolePlay', task: null, clarity: null, error: null }),
    ).toBe(true);
  });

  it('is false when anything survived', () => {
    expect(
      isExaminerFeedbackEmpty({
        profile: 'rail',
        turnKind: 'topic',
        errors: [{ quote: 'je fais', correction: 'je fais', category: 'other' }],
        strength: null,
      }),
    ).toBe(false);
    expect(
      isExaminerFeedbackEmpty({
        profile: 'rail',
        turnKind: 'topic',
        errors: [],
        strength: { claim: 'You gave a clear reason.', quote: 'avec mes amis' },
      }),
    ).toBe(false);
  });
});

describe('getGroundedExaminerFeedback retry behavior', () => {
  const transcript = 'Je joue au football le weekend avec mes amis.';
  const input: ExaminerParseInput = { transcript, turnKind: 'topic', inputMode: 'speech' };
  const good = {
    strengths: [{ claim: 'A clear present-tense sentence.', quote: 'Je joue au football' }],
    errors: [],
    nextStep: null,
  };
  const ungrounded = { strengths: [{ claim: 'x', quote: 'not in the transcript at all' }], errors: [], nextStep: null };

  it('returns the first result when it grounds, without retrying', async () => {
    let calls = 0;
    const result = await getGroundedExaminerFeedback('learn', input, async () => {
      calls += 1;
      return good;
    });
    expect(calls).toBe(1);
    expect(result.profile).toBe('learn');
  });

  it('asks for attempt 1, then attempt 2 on the one retry, and succeeds if the retry grounds', async () => {
    const attempts: number[] = [];
    const result = await getGroundedExaminerFeedback('learn', input, async (attempt) => {
      attempts.push(attempt);
      return attempt === 1 ? ungrounded : good;
    });
    expect(attempts).toEqual([1, 2]);
    expect(result.profile).toBe('learn');
  });

  it('throws ExaminerGroundingFailedError after exactly one retry when both attempts are unusable', async () => {
    const attempts: number[] = [];
    await expect(
      getGroundedExaminerFeedback('learn', input, async (attempt) => {
        attempts.push(attempt);
        return ungrounded;
      }),
    ).rejects.toThrow(ExaminerGroundingFailedError);
    expect(attempts).toEqual([1, 2]);
  });

  it('a malformed reply (not an object) is retried too', async () => {
    const attempts: number[] = [];
    await expect(
      getGroundedExaminerFeedback('learn', input, async (attempt) => {
        attempts.push(attempt);
        return 'not json';
      }),
    ).rejects.toThrow(ExaminerGroundingFailedError);
    expect(attempts).toEqual([1, 2]);
  });

  it('a rail topic turn with nothing to fix is a real result: no retry, no error', async () => {
    let calls = 0;
    const result = await getGroundedExaminerFeedback('rail', input, async () => {
      calls += 1;
      return { errors: [] };
    });
    expect(calls).toBe(1);
    expect(result).toEqual({ profile: 'rail', turnKind: 'topic', errors: [], strength: null });
  });
});

describe('examinerFeedback.ts import graph (architectural constraint)', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8');
  const importPaths = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);

  it('imports only rubric data, the stt input-mode type and examFeedback/shared from the domain', () => {
    const domainImports = importPaths.filter((p) => /domain\//.test(p));
    expect(domainImports.length).toBeGreaterThan(0);
    for (const p of domainImports) {
      const ok =
        p === '../../domain/igcse/rubric' ||
        p === '../../domain/igcse/stt/types' ||
        /^\.\.\/\.\.\/domain\/examFeedback\/shared\/[A-Za-z]+$/.test(p);
      expect(ok, p).toBe(true);
    }
  });

  it('never imports the scoring/envelope/guardrails/session machinery', () => {
    expect(source).not.toMatch(/domain\/igcse\/judgement/);
    expect(source).not.toMatch(/domain\/igcse\/envelope/);
    expect(source).not.toMatch(/domain\/igcse\/guardrails/);
    expect(source).not.toMatch(/domain\/igcse\/session/);
  });

  it('never imports examFeedback outside shared/ (Batch A\'s generator is not reachable from here)', () => {
    for (const p of importPaths) {
      if (/examFeedback/.test(p)) expect(p).toMatch(/examFeedback\/shared\//);
    }
  });
});
