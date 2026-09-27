/**
 * Original practice fixtures — NOT UCLES copyright exam scripts.
 * Used by S1 judgement tests only.
 */

import { RP_MARK_2, COMM_7_9, QOL_7_9 } from '../../canonical';
import {
  parseQualityOfLanguageOutput,
  parseRolePlayCommunicationOutput,
} from '../schema';
import type { QualityOfLanguageOutput, RolePlayCommunicationOutput } from '../schema';
import { combineAssessment } from '../scoreSpeaking';
import type { Judge, SpeakingAssessment, SpeakingTranscript } from '../types';

/** Curly apostrophe (U+2019) in j'ai — tests apostrophe normalization. */
const CURLY_APOSTROPHE = '\u2019';

export const PRACTICE_TRANSCRIPT: SpeakingTranscript = {
  contentProvenance: 'original-practice',
  rolePlay: [
    {
      taskId: 't1',
      taskPrompt: 'Greet the shop assistant.',
      candidateResponse: 'Bonjour madame.',
    },
    {
      taskId: 't2',
      taskPrompt: 'Say you want two croissants.',
      candidateResponse: 'Je voudrais deux  croissants, s il vous plaît.',
    },
    {
      taskId: 't3',
      taskPrompt: 'Ask the price.',
      candidateResponse: 'C est combien?',
    },
    {
      taskId: 't4',
      taskPrompt: 'Say you will pay by card.',
      candidateResponse: 'Je paie par carte.',
    },
    {
      taskId: 't5',
      taskPrompt: 'Thank and say goodbye.',
      candidateResponse: 'Merci, au revoir.',
    },
  ],
  topicConversations: [
    {
      conversationId: 'topic1',
      topicArea: 'A',
      turns: [
        {
          turnId: 'q1',
          questionPrompt: 'What do you do at weekends?',
          candidateResponse: `Le samedi j${CURLY_APOSTROPHE}ai joué au football avec mes amis.`,
        },
        {
          turnId: 'q2',
          questionPrompt: 'Do you prefer sport or cinema?',
          candidateResponse: 'Je préfère le sport parce que c est amusant.',
        },
      ],
    },
    {
      conversationId: 'topic2',
      topicArea: 'B',
      turns: [
        {
          turnId: 'q1',
          questionPrompt: 'Describe your best friend.',
          candidateResponse: 'Mon meilleur ami s appelle Thomas et il est très sympa.',
        },
        {
          turnId: 'q2',
          questionPrompt: 'What do you do together?',
          candidateResponse: 'Nous écoutons de la musique ensemble.',
        },
      ],
    },
  ],
};

/** Valid reply to the 'rolePlayCommunication' call for PRACTICE_TRANSCRIPT. */
export function buildValidMainOutput(overrides?: Partial<RolePlayCommunicationOutput>): RolePlayCommunicationOutput {
  const base: RolePlayCommunicationOutput = {
    rolePlay: {
      tasks: [
        {
          taskId: 't1',
          mark: 2,
          descriptorApplied: RP_MARK_2[0],
          evidenceSpans: [{ source: 'rolePlay', quote: 'Bonjour madame' }],
        },
        {
          taskId: 't2',
          mark: 2,
          descriptorApplied: RP_MARK_2[0],
          evidenceSpans: [{ source: 'rolePlay', quote: 'deux croissants' }],
        },
        {
          taskId: 't3',
          mark: 1,
          descriptorApplied: 'Errors impede communication.',
          evidenceSpans: [{ source: 'rolePlay', quote: 'C est combien' }],
        },
        {
          taskId: 't4',
          mark: 2,
          descriptorApplied: RP_MARK_2[0],
          evidenceSpans: [{ source: 'rolePlay', quote: 'Je paie par carte' }],
        },
        {
          taskId: 't5',
          mark: 2,
          descriptorApplied: RP_MARK_2[0],
          evidenceSpans: [{ source: 'rolePlay', quote: 'Merci, au revoir' }],
        },
      ],
    },
    communication: {
      mark: 8,
      band: { min: 7, max: 9, label: 'Satisfactory' },
      bestFitPlacement: 'adequately',
      descriptorsApplied: [COMM_7_9[0], COMM_7_9[1]],
      justification: 'Responds satisfactorily with mostly relevant information.',
      evidenceSpans: [
        { source: 'topic1', quote: `j${CURLY_APOSTROPHE}ai joué au football` },
        { source: 'topic2', quote: 'Mon meilleur ami' },
      ],
    },
  };

  return { ...base, ...overrides };
}

/** Valid reply to the 'qualityOfLanguage' call for PRACTICE_TRANSCRIPT. */
export function buildValidQolOutput(overrides?: Partial<QualityOfLanguageOutput>): QualityOfLanguageOutput {
  const base: QualityOfLanguageOutput = {
    errors: [
      {
        source: 'topic1',
        turnId: 'q1',
        quote: `Le samedi j${CURLY_APOSTROPHE}ai joué`,
        kind: 'grammar',
        correction: `Samedi dernier, j${CURLY_APOSTROPHE}ai joué`,
      },
    ],
    errorFrequency: 'some errors',
    mark: 8,
    band: { min: 7, max: 9, label: 'Satisfactory' },
    bestFitPlacement: 'adequately',
    descriptorsApplied: [QOL_7_9[0]],
    justification: 'Satisfactory structures with frequent errors.',
    evidenceSpans: [{ source: 'topic1', quote: 'Je préfère le sport' }],
  };

  return { ...base, ...overrides };
}

/** A Judge that answers each L2 call kind with the matching reply. */
export function fakeJudgeFor(
  main: unknown = buildValidMainOutput(),
  qol: unknown = buildValidQolOutput(),
): Judge {
  return async (req) => ({
    raw: JSON.stringify(req.kind === 'qualityOfLanguage' ? qol : main),
  });
}

/** The SpeakingAssessment the two valid replies above parse to. */
export function buildValidAssessment(
  main: RolePlayCommunicationOutput = buildValidMainOutput(),
  qol: QualityOfLanguageOutput = buildValidQolOutput(),
  transcript: SpeakingTranscript = PRACTICE_TRANSCRIPT,
): SpeakingAssessment {
  return combineAssessment(
    parseRolePlayCommunicationOutput(main, transcript),
    parseQualityOfLanguageOutput(qol, transcript),
  );
}
