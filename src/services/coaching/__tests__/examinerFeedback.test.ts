import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildExaminerPromptTemplates,
  EXAMINER_DATA_BEGIN,
  EXAMINER_DATA_END,
  EXAMINER_FEEDBACK_PROMPT_VERSION,
  groundExaminerFeedback,
  isExaminerFeedbackEmpty,
  getGroundedExaminerFeedback,
  ExaminerGroundingFailedError,
  type ExaminerFeedback,
} from '../examinerFeedback';

const SOURCE_PATH = join(__dirname, '../examinerFeedback.ts');

describe('buildExaminerPromptTemplates (server-rendered, v1)', () => {
  const templates = buildExaminerPromptTemplates();
  const v1 = templates[EXAMINER_FEEDBACK_PROMPT_VERSION];
  const prompt = v1.learn.topic.template;

  it('holds the version this client sends, for both profiles and both turn kinds', () => {
    for (const profile of ['learn', 'rail'] as const) {
      for (const kind of ['topic', 'rolePlay'] as const) {
        expect(v1[profile][kind].template).toBe(prompt);
      }
    }
  });

  it('forbids mark/band/total output', () => {
    expect(prompt).toMatch(/NEVER output a mark/i);
    expect(prompt).toMatch(/marks, bands, numbers, or totals/i);
  });

  it('requires verbatim quotes tied to every claim', () => {
    expect(prompt).toMatch(/verbatim quote/i);
  });

  it('scopes commentary to structures/vocabulary, excluding pronunciation', () => {
    expect(prompt).toMatch(/say nothing about pronunciation/i);
  });

  it('includes the real rubric descriptor language, not invented bands', () => {
    expect(prompt).toMatch(/Very good/);
    expect(prompt).not.toMatch(/Foundation-Developing|Core-Secure|Extended-High/);
  });

  it('puts the question and transcript placeholders only inside the DATA BOUNDARY', () => {
    const blocks = [...prompt.matchAll(new RegExp(`${EXAMINER_DATA_BEGIN}\\n(.*?)\\n${EXAMINER_DATA_END}`, 'g'))].map(
      (m) => m[1],
    );
    expect(blocks).toEqual(['{{question}}', '{{transcript}}']);
    const outside = prompt.replace(new RegExp(`${EXAMINER_DATA_BEGIN}\\n.*?\\n${EXAMINER_DATA_END}`, 'g'), '');
    expect(outside).not.toMatch(/\{\{/);
    expect(prompt).toMatch(/DATA BOUNDARY/);
  });

  it('keeps the verbatim-quoting reminder for the retry attempt', () => {
    expect(v1.learn.topic.retryReminder).toMatch(/Copy the candidate's exact words/);
    expect(v1.learn.topic.retryReminder).not.toMatch(/\{\{/);
  });
});

describe('groundExaminerFeedback', () => {
  const transcript = "Je me réveille à sept heures et je prends le petit déjeuner.";

  it('keeps claims whose quote is verbatim in the transcript', () => {
    const raw: ExaminerFeedback = {
      currentDescriptorCommentary: [{ claim: 'uses present tense', quote: 'je prends le petit déjeuner' }],
      improvementCommentary: [],
    };
    const grounded = groundExaminerFeedback(raw, transcript);
    expect(grounded.currentDescriptorCommentary).toHaveLength(1);
  });

  it('drops claims whose quote is not in the transcript', () => {
    const raw: ExaminerFeedback = {
      currentDescriptorCommentary: [{ claim: 'invented', quote: 'ceci ne figure pas dans la transcription' }],
      improvementCommentary: [{ claim: 'invented 2', quote: 'un autre texte fabriqué' }],
    };
    const grounded = groundExaminerFeedback(raw, transcript);
    expect(grounded.currentDescriptorCommentary).toHaveLength(0);
    expect(grounded.improvementCommentary).toHaveLength(0);
  });
});

describe('isExaminerFeedbackEmpty', () => {
  it('is true when both arrays are empty', () => {
    expect(isExaminerFeedbackEmpty({ currentDescriptorCommentary: [], improvementCommentary: [] })).toBe(true);
  });

  it('is false when at least one array has an entry', () => {
    expect(
      isExaminerFeedbackEmpty({
        currentDescriptorCommentary: [{ claim: 'x', quote: 'y' }],
        improvementCommentary: [],
      }),
    ).toBe(false);
  });
});

describe('getGroundedExaminerFeedback retry behavior', () => {
  const transcript = 'Je joue au football le weekend.';

  it('returns the first result when it grounds successfully, without retrying', async () => {
    let calls = 0;
    const generate = async (): Promise<ExaminerFeedback> => {
      calls += 1;
      return {
        currentDescriptorCommentary: [{ claim: 'simple present tense', quote: 'Je joue au football' }],
        improvementCommentary: [],
      };
    };
    const result = await getGroundedExaminerFeedback(transcript, generate);
    expect(calls).toBe(1);
    expect(result.currentDescriptorCommentary).toHaveLength(1);
  });

  it('retries exactly once when every citation is ungrounded, then succeeds if the retry grounds', async () => {
    let calls = 0;
    const generate = async (): Promise<ExaminerFeedback> => {
      calls += 1;
      if (calls === 1) {
        return {
          currentDescriptorCommentary: [{ claim: 'x', quote: 'not in transcript at all' }],
          improvementCommentary: [],
        };
      }
      return {
        currentDescriptorCommentary: [{ claim: 'x', quote: 'Je joue au football' }],
        improvementCommentary: [],
      };
    };
    const result = await getGroundedExaminerFeedback(transcript, generate);
    expect(calls).toBe(2);
    expect(result.currentDescriptorCommentary).toHaveLength(1);
  });

  it('asks for attempt 1, then attempt 2 on the one retry (the backend appends the reminder)', async () => {
    const attempts: number[] = [];
    const generate = async (attempt: 1 | 2): Promise<ExaminerFeedback> => {
      attempts.push(attempt);
      return { currentDescriptorCommentary: [{ claim: 'x', quote: 'fabricated' }], improvementCommentary: [] };
    };
    await expect(getGroundedExaminerFeedback(transcript, generate)).rejects.toThrow(ExaminerGroundingFailedError);
    expect(attempts).toEqual([1, 2]);
  });

  it('throws ExaminerGroundingFailedError after exactly one retry when both attempts are fully ungrounded', async () => {
    let calls = 0;
    const generate = async (): Promise<ExaminerFeedback> => {
      calls += 1;
      return {
        currentDescriptorCommentary: [{ claim: 'x', quote: 'complete fabrication' }],
        improvementCommentary: [{ claim: 'y', quote: 'another fabrication' }],
      };
    };
    await expect(getGroundedExaminerFeedback(transcript, generate)).rejects.toThrow(
      ExaminerGroundingFailedError,
    );
    expect(calls).toBe(2);
  });
});

describe('examinerFeedback.ts import graph (architectural constraint)', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8');

  it('imports only rubric descriptor data and isQuoteGrounded from src/domain/igcse', () => {
    const igcseImports = [...source.matchAll(/from '([^']*domain\/igcse[^']*)'/g)].map((m) => m[1]);
    expect(igcseImports.length).toBeGreaterThan(0);
    for (const importPath of igcseImports) {
      expect(importPath === '../../domain/igcse/rubric' || importPath === '../../domain/igcse/judgement/schema').toBe(
        true,
      );
    }
  });

  it('never imports the scoring/envelope/guardrails/session machinery', () => {
    expect(source).not.toMatch(/domain\/igcse\/judgement\/scoreSpeaking/);
    expect(source).not.toMatch(/domain\/igcse\/envelope/);
    expect(source).not.toMatch(/domain\/igcse\/guardrails/);
    expect(source).not.toMatch(/domain\/igcse\/session/);
  });
});
