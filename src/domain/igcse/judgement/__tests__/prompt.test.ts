import { describe, it, expect } from 'vitest';
import {
  RP_MARK_2,
  COMM_13_15,
  QOL_13_15,
  PRINCIPLE_TC_CONVINCINGLY,
  PRINCIPLE_TC_ADEQUATELY,
  PRINCIPLE_TC_JUST,
} from '../../canonical';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import { buildJudgementPrompt } from '../prompt';
import { PRACTICE_TRANSCRIPT } from './fixtures';

describe('buildJudgementPrompt', () => {
  const evidence = buildEvidenceSubset(PRACTICE_TRANSCRIPT);
  const prompt = buildJudgementPrompt(PRACTICE_TRANSCRIPT, evidence);

  it('states examiner role', () => {
    expect(prompt).toContain('Cambridge IGCSE French 0520 Paper 3 Speaking examiner');
  });

  it('includes verbatim role play descriptors from canonical', () => {
    for (const bullet of RP_MARK_2) {
      expect(prompt).toContain(bullet);
    }
  });

  it('includes verbatim communication band descriptors', () => {
    for (const bullet of COMM_13_15) {
      expect(prompt).toContain(bullet);
    }
  });

  it('includes verbatim quality of language band descriptors', () => {
    for (const bullet of QOL_13_15) {
      expect(prompt).toContain(bullet);
    }
  });

  it('includes topic conversation placement principles', () => {
    expect(prompt).toContain(PRINCIPLE_TC_CONVINCINGLY);
    expect(prompt).toContain(PRINCIPLE_TC_ADEQUATELY);
    expect(prompt).toContain(PRINCIPLE_TC_JUST);
  });

  it('includes every candidate response and task/question prompt', () => {
    for (const task of PRACTICE_TRANSCRIPT.rolePlay) {
      expect(prompt).toContain(task.taskPrompt);
      expect(prompt).toContain(task.candidateResponse);
    }
    for (const conv of PRACTICE_TRANSCRIPT.topicConversations) {
      for (const turn of conv.turns) {
        expect(prompt).toContain(turn.questionPrompt);
        expect(prompt).toContain(turn.candidateResponse);
      }
    }
  });

  it('labels evidence sources for rolePlay, topic1, topic2', () => {
    expect(prompt).toContain('[evidence source: rolePlay]');
    expect(prompt).toContain('[evidence source: topic1]');
    expect(prompt).toContain('[evidence source: topic2]');
  });

  it('instructs bottom-up best-fit and no invented evidence', () => {
    expect(prompt).toMatch(/bottom-up|bottom up/i);
    expect(prompt).toContain('NEVER invent evidence');
    expect(prompt).toContain('VERBATIM descriptor');
  });

  it('states role play has no middle marks / no placement principle', () => {
    expect(prompt).toMatch(/NO middle marks/i);
    expect(prompt).toMatch(/do not apply the convincingly/i);
  });

  it('includes JSON output contract', () => {
    expect(prompt).toContain('"rolePlay"');
    expect(prompt).toContain('"communication"');
    expect(prompt).toContain('"qualityOfLanguage"');
    expect(prompt).toContain('bestFitPlacement');
  });

  it('documents normalization tolerance for LLM citation near-misses in instructions', () => {
    // Prompt asks for verbatim citation; normalization is enforced at parse time.
    // Near-miss acceptance is tested in schema.test.ts — prompt must require evidence spans.
    expect(prompt).toContain('quote specific spans');
  });

  it('includes the Layer 1 EvidenceProfile, not just the raw transcript', () => {
    expect(prompt).toContain('Layer 1 evidence');

    const firstTimeFrameRow = evidence.timeFrameAlignmentByQuestion[0];
    expect(prompt).toContain(
      `${firstTimeFrameRow.questionId}: expected=${firstTimeFrameRow.expectedTimeFrame ?? 'n/a'}`,
    );

    const firstPartsRow = evidence.rolePlayPartsByTask[0];
    expect(prompt).toContain(
      `${firstPartsRow.taskId}: partsExpected=${firstPartsRow.partsExpected}, partsAddressed=${firstPartsRow.partsAddressed}`,
    );

    const firstDurationRow = evidence.topicConversationDurationByConversation[0];
    expect(prompt).toContain(
      `${firstDurationRow.conversationId}: candidateSpeakingDurationS=${firstDurationRow.candidateSpeakingDurationS}`,
    );
  });
});
