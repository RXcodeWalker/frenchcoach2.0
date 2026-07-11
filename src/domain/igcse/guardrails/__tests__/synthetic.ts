/**
 * S5 synthetic transcript "trip set" — proves each guardrail fires on its
 * trigger and stays silent on clean input (roadmap S5 exit criterion). This
 * is the reservoir S6 (Phase A) extends into the full examiner-report
 * taxonomy corpus; fixtures below are named/commented by the guardrail they
 * exercise so S6 can add to this file rather than rewrite it.
 *
 * Original practice fixtures — NOT UCLES copyright exam scripts.
 */

import { PRACTICE_TRANSCRIPT, buildValidJudgeOutput } from '../../judgement/__tests__/fixtures';
import { parseAndValidateJudgeOutput } from '../../judgement/schema';
import type { SpeakingAssessment, SpeakingTranscript } from '../../judgement/types';

/**
 * Clean, sufficiently long transcript: same role play as PRACTICE_TRANSCRIPT
 * (so buildValidJudgeOutput()'s role-play evidence spans stay grounded), but
 * with topic-conversation responses long enough (>=200 combined words) that
 * neither insufficient-evidence sub-check trips — the "silent on clean input"
 * fixture for both guardrails.
 */
export const CLEAN_LONG_TRANSCRIPT: SpeakingTranscript = {
  ...PRACTICE_TRANSCRIPT,
  topicConversations: [
    {
      conversationId: 'topic1',
      topicArea: 'A',
      turns: [
        {
          turnId: 'q1',
          questionPrompt: 'What do you do at weekends?',
          candidateResponse:
            "Le samedi j'ai joué au football avec mes amis dans le parc pres de chez moi et ensuite nous " +
            'sommes alles au cafe pour parler de nos projets et de nos vacances pendant longtemps et ' +
            'nous avons aussi discute de nos matieres preferees au college et de nos projets pour les ' +
            'grandes vacances qui arrivent bientot cette annee.',
        },
        {
          turnId: 'q2',
          questionPrompt: 'Do you prefer sport or cinema?',
          candidateResponse:
            'Je préfère le sport parce que c est amusant et je me sens en meilleure forme apres avoir ' +
            'couru pendant une heure avec mon equipe le weekend dernier et je pense que le cinema est ' +
            'aussi agreable mais moins actif donc je prefere sortir et bouger avec mes camarades plutot ' +
            'que de rester assis pendant deux heures.',
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
          candidateResponse:
            'Mon meilleur ami s appelle Thomas et il est très sympa et genereux avec tout le monde ' +
            'autour de lui et nous nous connaissons depuis l ecole primaire et il aime beaucoup jouer ' +
            'de la guitare et regarder des films avec ses amis pendant le weekend quand il a du temps libre.',
        },
        {
          turnId: 'q2',
          questionPrompt: 'What do you do together?',
          candidateResponse:
            'Nous écoutons de la musique ensemble et parfois nous allons au cinema le weekend pour ' +
            'nous detendre un peu apres une semaine chargee de devoirs et nous aimons aussi faire du ' +
            'velo dans la foret pres de chez lui quand il fait beau en ete.',
        },
      ],
    },
  ],
};

// ── Quote verification ────────────────────────────────────────────────────────

/** Clean assessment: every span is a real substring of CLEAN_LONG_TRANSCRIPT. */
export const CLEAN_ASSESSMENT: SpeakingAssessment = parseAndValidateJudgeOutput(
  buildValidJudgeOutput(),
  CLEAN_LONG_TRANSCRIPT,
);

/**
 * Fabricated-quote assessment: built by hand (not through parseAndValidateJudgeOutput,
 * which would reject it) to prove verifyQuotes independently catches an
 * ungrounded quote — the "no evidence fabrication" failure mode.
 */
export const FABRICATED_QUOTE_ASSESSMENT: SpeakingAssessment = {
  ...CLEAN_ASSESSMENT,
  communication: {
    ...CLEAN_ASSESSMENT.communication,
    evidenceSpans: [
      { source: 'topic1', quote: 'ceci ne figure jamais dans la transcription' },
    ],
  },
};

// ── Insufficient-evidence duration ────────────────────────────────────────────

/**
 * Fires (word path): combined topic-conversation word count < 200, no
 * turn carries candidateResponseDurationS, so only the word sub-check trips.
 */
export const LOW_WORD_COUNT_TRANSCRIPT: SpeakingTranscript = {
  ...PRACTICE_TRANSCRIPT,
  topicConversations: [
    {
      conversationId: 'topic1',
      topicArea: 'A',
      turns: [
        { turnId: 'q1', questionPrompt: 'What do you do at weekends?', candidateResponse: 'Le foot.' },
        { turnId: 'q2', questionPrompt: 'Do you prefer sport or cinema?', candidateResponse: 'Le sport.' },
      ],
    },
    {
      conversationId: 'topic2',
      topicArea: 'B',
      turns: [
        { turnId: 'q1', questionPrompt: 'Describe your best friend.', candidateResponse: 'Il est sympa.' },
        { turnId: 'q2', questionPrompt: 'What do you do together?', candidateResponse: 'On joue.' },
      ],
    },
  ],
};

/**
 * Fires (duration path): turns carry candidateResponseDurationS summing
 * < 240s, but word count >= 200 — duration sub-check trips, word sub-check
 * does not.
 */
const LONG_RESPONSE =
  'Le samedi je joue au football avec mes amis dans le parc pres de chez moi et ensuite nous allons ' +
  'au cafe pour parler de nos projets et de nos vacances et le dimanche je reste a la maison avec ma ' +
  'famille pour regarder des films et preparer le repas ensemble ce qui est toujours tres agreable ' +
  'et je pense que c est important de passer du temps avec les gens que on aime le plus au monde.';

export const LOW_DURATION_TRANSCRIPT: SpeakingTranscript = {
  ...PRACTICE_TRANSCRIPT,
  topicConversations: [
    {
      conversationId: 'topic1',
      topicArea: 'A',
      turns: [
        {
          turnId: 'q1',
          questionPrompt: 'What do you do at weekends?',
          candidateResponse: LONG_RESPONSE,
          candidateResponseDurationS: 50,
        },
        {
          turnId: 'q2',
          questionPrompt: 'Do you prefer sport or cinema?',
          candidateResponse: LONG_RESPONSE,
          candidateResponseDurationS: 50,
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
          candidateResponse: LONG_RESPONSE,
          candidateResponseDurationS: 50,
        },
        {
          turnId: 'q2',
          questionPrompt: 'What do you do together?',
          candidateResponse: LONG_RESPONSE,
          candidateResponseDurationS: 50,
        },
      ],
    },
  ],
};

/**
 * Silent (missing-timing guard): normal-length, word-count-sufficient
 * transcript with no timing at all — duration reads 0 but must NOT trip,
 * because absence of timing is not a penalty signal (word count carries it).
 */
export const CLEAN_NO_TIMING_TRANSCRIPT: SpeakingTranscript = CLEAN_LONG_TRANSCRIPT;
