import { describe, it, expect } from 'vitest';
import {
  RP_MARK_2,
  COMM_13_15,
  QOL_13_15,
  PRINCIPLE_TC_CONVINCINGLY,
  PRINCIPLE_TC_ADEQUATELY,
  PRINCIPLE_TC_JUST,
} from '../../canonical';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import {
  buildQualityOfLanguagePrompt,
  buildRolePlayCommunicationPrompt,
  QOL_NO_MINOR_ALLOWANCE_LINE,
  QOL_NO_QUANTITY_LINE,
  QOL_NOT_A_FORMULA_LINE,
  QOL_QUOTE_RULE_LINE,
  _PROMPT_EVIDENCE_ALLOW_LIST,
  _QOL_JSON_OUTPUT_CONTRACT,
} from '../prompt';
import { PRACTICE_TRANSCRIPT } from './fixtures';
import type { SpeakingTranscript } from '../types';

describe('buildRolePlayCommunicationPrompt', () => {
  const evidence = buildEvidenceProfile(PRACTICE_TRANSCRIPT);
  const prompt = buildRolePlayCommunicationPrompt(PRACTICE_TRANSCRIPT, evidence);

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

  it('scoring-prompt-v0.6: carries no Table C and says QoL is marked separately', () => {
    expect(prompt).not.toContain('Table C');
    for (const bullet of QOL_13_15) {
      expect(prompt).not.toContain(bullet);
    }
    expect(prompt).toContain(
      "Quality of Language is marked in a separate step. Mark Communication on Table B's descriptors only.",
    );
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
    expect(prompt).not.toContain('"qualityOfLanguage"');
    expect(prompt).toContain('bestFitPlacement');
  });

  it('documents normalization tolerance for LLM citation near-misses in instructions', () => {
    // Prompt asks for verbatim citation; normalization is enforced at parse time.
    // Near-miss acceptance is tested in schema.test.ts — prompt must require evidence spans.
    expect(prompt).toContain('quote specific spans');
  });

  it('includes the Layer 1 EvidenceProfile, not just the raw transcript', () => {
    expect(prompt).toContain('Layer 1 evidence');

    const firstCountRow = evidence.responseCountsByQuestion[0];
    expect(prompt).toContain(
      `${firstCountRow.questionId}: wordCount=${firstCountRow.wordCount}, responseCount=${firstCountRow.responseCount}`,
    );

    const firstDurationRow = evidence.topicConversationDurationByConversation[0];
    expect(prompt).toContain(
      `${firstDurationRow.conversationId}: candidateSpeakingDurationS=${firstDurationRow.candidateSpeakingDurationS}`,
    );
  });

  it('rendered-field-set snapshot: prompt evidence allow-list is exactly the two factual count fields (P0 step 3)', () => {
    expect(_PROMPT_EVIDENCE_ALLOW_LIST).toEqual([
      'responseCountsByQuestion',
      'topicConversationDurationByConversation',
    ]);
  });

  it('P0 step 3: unvalidated L1 heuristics (time frame, filler density, role-play parts) never reach the prompt', () => {
    // Still computed for the envelope's audit snapshot…
    expect(evidence.timeFrameAlignmentByQuestion.length).toBeGreaterThan(0);
    expect(evidence.fillerDensityByQuestion.length).toBeGreaterThan(0);
    expect(evidence.rolePlayPartsByTask.length).toBeGreaterThan(0);
    // …but not rendered.
    expect(prompt).not.toContain('Time-frame alignment');
    expect(prompt).not.toMatch(/alignment=/);
    expect(prompt).not.toContain('Filler density');
    expect(prompt).not.toMatch(/fillerCount=/);
    expect(prompt).not.toContain('Role-play parts addressed');
    expect(prompt).not.toMatch(/partsAddressed=/);
  });

  it('D1: the RENDERED prompt carries no Phase-3-only evidence field marker (observations, features, detectorRuns, detectorVersions)', () => {
    // The allow-list snapshot above only proves the constant's shape; this
    // proves formatEvidence is actually driven by it — an unlisted field
    // would have to appear as literal text in the prompt to leak.
    expect(prompt).not.toContain('"observations"');
    expect(prompt).not.toContain('"features"');
    expect(prompt).not.toContain('"detectorRuns"');
    expect(prompt).not.toContain('"detectorVersions"');
    expect(prompt).not.toMatch(/\bobservationId\b/);
    expect(prompt).not.toMatch(/\bmarkInfluence\b/);
    expect(prompt).not.toMatch(/\bskillNodeId\b/);
  });

  describe('P0 step 2: examiner support, further questions, ASR and delivery instructions', () => {
    const supported: SpeakingTranscript = {
      ...PRACTICE_TRANSCRIPT,
      rolePlay: PRACTICE_TRANSCRIPT.rolePlay.map((task, i) =>
        i === 0 ? { ...task, secondPartPrompt: 'Et pour combien de personnes ?', repetitions: 1 } : task,
      ),
      topicConversations: [
        {
          ...PRACTICE_TRANSCRIPT.topicConversations[0],
          turns: [
            {
              ...PRACTICE_TRANSCRIPT.topicConversations[0].turns[0],
              examinerSupport: {
                repetitions: 1,
                alternativeAsked: 'Où voudrais-tu aller en vacances ?',
                secondPartAsked: 'Pourquoi ?',
                extensionPrompts: 2,
              },
            },
            ...PRACTICE_TRANSCRIPT.topicConversations[0].turns.slice(1),
            {
              turnId: 'further1',
              questionPrompt: 'Que fais-tu le week-end ?',
              candidateResponse: 'Je vais au cinéma avec mes amis.',
            },
          ],
        },
        PRACTICE_TRANSCRIPT.topicConversations[1],
      ],
    };
    const supportedPrompt = buildRolePlayCommunicationPrompt(supported, buildEvidenceProfile(supported));

    it('renders the examiner support on the Asked line', () => {
      const turn = supported.topicConversations[0].turns[0];
      expect(supportedPrompt).toContain(
        `Asked: ${turn.questionPrompt} | Repeated ×1 | Alternative question used: 'Où voudrais-tu aller en vacances ?' | Second part asked: 'Pourquoi ?' | Extension prompts: 2`,
      );
    });

    it('renders a turn with no recorded support as a bare Asked line', () => {
      const turn = supported.topicConversations[1].turns[0];
      expect(supportedPrompt).toContain(`Asked: ${turn.questionPrompt}\nCandidate response:`);
    });

    it("renders a role-play task's second part and repetitions", () => {
      const task = supported.rolePlay[0];
      expect(supportedPrompt).toContain(
        `Instruction: ${task.taskPrompt} | Second part: 'Et pour combien de personnes ?' | Repeated ×1`,
      );
    });

    it('labels a further-question turn as the examiner\'s choice and includes its answer', () => {
      expect(supportedPrompt).toContain("Turn further1 — Further question (examiner's choice)");
      expect(supportedPrompt).toContain('Asked: Que fais-tu le week-end ?');
      expect(supportedPrompt).toContain('Candidate response: Je vais au cinéma avec mes amis.');
    });

    it('instructs the judge to read repetition/alternative use only from the recorded support', () => {
      expect(prompt).toMatch(/first Communication bullet.*ONLY from the examiner support recorded/);
    });

    it('tells the judge the transcript is speech-recognition output', () => {
      expect(prompt).toContain('The transcript is speech-recognition output.');
      expect(prompt).toContain('-é/-er/-ez');
      expect(prompt).toMatch(/ignore all punctuation/);
    });

    it('leaves the delivery rule to the QoL call', () => {
      expect(prompt).not.toContain('Pronunciation, intonation and expression cannot be heard');
    });
  });
});

describe('buildQualityOfLanguagePrompt (scoring-prompt-v0.6)', () => {
  const prompt = buildQualityOfLanguagePrompt(PRACTICE_TRANSCRIPT);
  const evidence = buildEvidenceProfile(PRACTICE_TRANSCRIPT);

  it('includes Table C only — no Table A, no Table B', () => {
    expect(prompt).toContain('Table C');
    for (const bullet of QOL_13_15) expect(prompt).toContain(bullet);
    expect(prompt).not.toContain('Table A');
    expect(prompt).not.toContain('Table B');
    for (const bullet of COMM_13_15) expect(prompt).not.toContain(bullet);
    for (const bullet of RP_MARK_2) expect(prompt).not.toContain(bullet);
  });

  it('includes the topic-conversation placement principles', () => {
    expect(prompt).toContain(PRINCIPLE_TC_CONVINCINGLY);
    expect(prompt).toContain(PRINCIPLE_TC_ADEQUATELY);
    expect(prompt).toContain(PRINCIPLE_TC_JUST);
  });

  it('includes the topic conversations only — no role play', () => {
    for (const conv of PRACTICE_TRANSCRIPT.topicConversations) {
      for (const turn of conv.turns) {
        expect(prompt).toContain(`Asked: ${turn.questionPrompt}\nCandidate response: ${turn.candidateResponse}`);
      }
    }
    for (const task of PRACTICE_TRANSCRIPT.rolePlay) {
      expect(prompt).not.toContain(task.taskPrompt);
    }
    expect(prompt).not.toContain('[evidence source: rolePlay]');
    expect(prompt).not.toContain('### Role play');
  });

  it('carries no L1 word counts or evidence section', () => {
    expect(prompt).not.toContain('Layer 1 evidence');
    expect(prompt).not.toMatch(/wordCount=/);
    expect(prompt).not.toMatch(/candidateWordCount=/);
    expect(prompt).not.toMatch(/candidateSpeakingDurationS=/);
    expect(evidence.responseCountsByQuestion.length).toBeGreaterThan(0);
  });

  it('carries no examiner-support line', () => {
    const supported = {
      ...PRACTICE_TRANSCRIPT,
      topicConversations: [
        {
          ...PRACTICE_TRANSCRIPT.topicConversations[0],
          turns: [
            {
              ...PRACTICE_TRANSCRIPT.topicConversations[0].turns[0],
              examinerSupport: { repetitions: 2, alternativeAsked: 'Alt ?', secondPartAsked: 'Pourquoi ?', extensionPrompts: 1 },
            },
            ...PRACTICE_TRANSCRIPT.topicConversations[0].turns.slice(1),
          ],
        },
        PRACTICE_TRANSCRIPT.topicConversations[1],
      ],
    } as SpeakingTranscript;
    const supportedPrompt = buildQualityOfLanguagePrompt(supported);
    expect(supportedPrompt).not.toMatch(/Repeated ×/);
    expect(supportedPrompt).not.toContain('Alternative question used');
    expect(supportedPrompt).not.toContain('Extension prompts');
  });

  it("puts errors before the band in the JSON contract", () => {
    const contract = _QOL_JSON_OUTPUT_CONTRACT;
    expect(prompt).toContain(contract);
    const errorsAt = contract.indexOf('"errors"');
    expect(errorsAt).toBeGreaterThan(-1);
    expect(errorsAt).toBeLessThan(contract.indexOf('"errorFrequency"'));
    expect(contract.indexOf('"errorFrequency"')).toBeLessThan(contract.indexOf('"mark"'));
    expect(contract.indexOf('"errorFrequency"')).toBeLessThan(contract.indexOf('"band"'));
    expect(contract).not.toContain('"rolePlay"');
  });

  it('asks for every error, with a quote, before the band is chosen', () => {
    expect(prompt).toMatch(/First list EVERY grammar and vocabulary error.*Only then choose the band\./);
  });

  it('contains the no-quantity and no-minor-allowance lines verbatim', () => {
    expect(prompt).toContain(QOL_NO_QUANTITY_LINE);
    expect(prompt).toContain(QOL_NO_MINOR_ALLOWANCE_LINE);
  });

  it('contains the not-a-formula invariant, right before the band instructions', () => {
    expect(prompt).toContain(QOL_NOT_A_FORMULA_LINE);
    expect(prompt.indexOf(QOL_NOT_A_FORMULA_LINE)).toBeLessThan(prompt.indexOf('Work bottom-up'));
  });

  it('contains the quote rule', () => {
    expect(prompt).toContain(QOL_QUOTE_RULE_LINE);
  });

  it('reads the frequency wordings qualitatively, not as counts', () => {
    expect(prompt).toContain(
      "Read 'occasional', 'some' and 'frequent' against what the candidate actually said, not as counts.",
    );
    expect(prompt).toContain('13–15 allows only occasional errors in more complex language.');
  });

  it('carries the ASR rule (missing accents are not errors) and the delivery rule', () => {
    expect(prompt).toContain('The transcript is speech-recognition output.');
    expect(prompt).toContain('missing accents');
    expect(prompt).toContain('Such differences are not errors.');
    expect(prompt).toContain('Pronunciation, intonation and expression cannot be heard');
    expect(prompt).toMatch(/state in the justification that delivery .* was not assessed/);
  });

  it('keeps positive marking', () => {
    expect(prompt).toMatch(/Mark positively/);
  });
});
