/**
 * S5 synthetic transcript "trip set" — proves each guardrail fires on its
 * trigger and stays silent on clean input (roadmap S5 exit criterion). This
 * is the reservoir S6 (Phase A) extends into the full examiner-report
 * taxonomy corpus; fixtures below are named/commented by the guardrail they
 * exercise so S6 can add to this file rather than rewrite it.
 *
 * Original practice fixtures — NOT UCLES copyright exam scripts.
 */

import { PRACTICE_TRANSCRIPT, buildValidAssessment, buildValidQolOutput } from '../../judgement/__tests__/fixtures';
import type { QualityOfLanguageOutput } from '../../judgement/schema';
import type { QolError, QualityOfLanguageAssessment, SpeakingAssessment, SpeakingTranscript } from '../../judgement/types';
import type { EnvelopeTranscription } from '../../envelope/types';
import { markSpokenText } from '../../stt/project/spokenText';

/**
 * Clean, sufficiently long transcript: same role play as PRACTICE_TRANSCRIPT
 * (so buildValidMainOutput()'s role-play evidence spans stay grounded), but
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
export const CLEAN_ASSESSMENT: SpeakingAssessment = buildValidAssessment(
  undefined,
  undefined,
  CLEAN_LONG_TRANSCRIPT,
);

/**
 * Fabricated-quote assessment: built by hand (not through the L2 parsers,
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

/**
 * W1 silent (mixed speech/text guard): one turn per topic conversation is
 * spoken with a short real duration (well under minCombinedDurationS=240 on
 * its own), the other is typed (0s by construction) — combined duration stays
 * low, but combined word count clears minCombinedWordCount=200 and no turn is
 * untimed-but-spoken. Before the W1 fix this spuriously tripped the duration
 * sub-check even though the low duration is fully explained by typed turns,
 * not insufficient speaking; it must stay silent now.
 */
export const MIXED_TYPED_SPEECH_TRANSCRIPT: SpeakingTranscript = {
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
          candidateResponseDurationS: 30,
          inputMode: 'speech',
        },
        {
          turnId: 'q2',
          questionPrompt: 'Do you prefer sport or cinema?',
          candidateResponse: LONG_RESPONSE,
          candidateResponseDurationS: 0,
          inputMode: 'text',
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
          candidateResponseDurationS: 0,
          inputMode: 'text',
        },
        {
          turnId: 'q2',
          questionPrompt: 'What do you do together?',
          candidateResponse: LONG_RESPONSE,
          candidateResponseDurationS: 20,
          inputMode: 'speech',
        },
      ],
    },
  ],
};

// ── Stage 6: sound-alike rules (transcription-accuracy plan, Phase 4) ─────────
//
// Each case is CLEAN_LONG_TRANSCRIPT with topic2 q2 replaced by a spoken answer
// exactly as the projection hands it over (markSpokenText: Category A respelled,
// ambiguous spans), plus a static first QoL reply and — where something is
// excused — the static reply to the one re-ask. The role play, Communication
// and the rest of QoL evidence ground exactly as in CLEAN_ASSESSMENT.

/** Topic2 q2 as the projection would hand over this spoken answer. */
function withSpokenTopic2Q2(primary: string, secondary: string | null): SpeakingTranscript {
  const marked = markSpokenText(primary, secondary);
  const [topic1, topic2] = CLEAN_LONG_TRANSCRIPT.topicConversations;
  return {
    ...CLEAN_LONG_TRANSCRIPT,
    topicConversations: [
      topic1,
      {
        ...topic2,
        turns: [
          topic2.turns[0],
          { ...topic2.turns[1], candidateResponse: marked.text, inputMode: 'speech', ambiguousSpans: marked.spans },
        ],
      },
    ],
  };
}

function qolReply(mark: 7 | 8, errors: QolError[]): QualityOfLanguageOutput {
  return buildValidQolOutput({
    errors,
    errorFrequency: errors.length > 0 ? 'some errors' : 'occasional errors',
    mark,
    bestFitPlacement: mark === 8 ? 'adequately' : 'just',
  });
}

const t2q2Error = (quote: string, correction: string): QolError => ({
  source: 'topic2',
  turnId: 'q2',
  quote,
  kind: 'grammar',
  correction,
});

export interface SoundAlikeCase {
  transcript: SpeakingTranscript;
  assessment: SpeakingAssessment;
  qolReAsk?: QualityOfLanguageAssessment | 'failed';
}

function soundAlikeCase(
  transcript: SpeakingTranscript,
  first: QualityOfLanguageOutput,
  reAsk?: QualityOfLanguageOutput | 'failed',
): SoundAlikeCase {
  return {
    transcript,
    assessment: buildValidAssessment(undefined, first, transcript),
    ...(reAsk === undefined
      ? {}
      : { qolReAsk: reAsk === 'failed' ? 'failed' : buildValidAssessment(undefined, reAsk, transcript).qualityOfLanguage }),
  };
}

/**
 * Category A: "il zappent" — both recognisers agree, and the respeller leaves it
 * (zapper is not in its verb list), so the judge lists it. It sounds exactly
 * like "il zappe": excused as inaudible, the one re-ask drops it, its mark stands.
 */
const ZAPPENT = withSpokenTopic2Q2(
  "Le samedi nous restons chez lui et mon frère il zappent toujours entre les chaînes quand nous regardons la télé, alors nous jouons aux cartes ou nous faisons du vélo dans la forêt quand il fait beau en été.",
  "le samedi nous restons chez lui et mon frère il zappent toujours entre les chaînes quand nous regardons la télé alors nous jouons aux cartes ou nous faisons du vélo dans la forêt quand il fait beau en été",
);
export const SOUND_ALIKE_INAUDIBLE = soundAlikeCase(
  ZAPPENT,
  qolReply(7, [t2q2Error('il zappent', 'il zappe')]),
  qolReply(8, []),
);

const EN_CHIEN_PRIMARY =
  "Le dimanche nous regardons des films parce que j'ai en chien qui dort avec nous sur le canapé, alors nous restons à la maison quand il pleut et nous jouons aux jeux vidéo avec mes cousins pendant tout l'après-midi.";
const EN_CHIEN_SECONDARY = EN_CHIEN_PRIMARY.replace("j'ai en chien", "j'ai un chien");

/**
 * Category B, recognisers disagree: Whisper heard "j'ai en chien", the live
 * captions "j'ai un chien". Benefit of the doubt: excused as ambiguousNear
 * (the envelope keeps it, with its pair, for the "make sure you say it" note).
 */
export const SOUND_ALIKE_NEAR_DISAGREEMENT = soundAlikeCase(
  withSpokenTopic2Q2(EN_CHIEN_PRIMARY, EN_CHIEN_SECONDARY),
  qolReply(7, [t2q2Error("j'ai en chien", "j'ai un chien")]),
  qolReply(8, []),
);

/** Category B, both recognisers heard "en": the wrong word was clearly said, so it counts. No re-ask. */
export const SOUND_ALIKE_NEAR_AGREEMENT = soundAlikeCase(
  withSpokenTopic2Q2(EN_CHIEN_PRIMARY, EN_CHIEN_PRIMARY),
  qolReply(7, [t2q2Error("j'ai en chien", "j'ai un chien")]),
);

/**
 * Recognisers heard clearly different words (un / une is not a sound-alike
 * pair). Owner rule until the STT benchmark: treated as a disagreement — the
 * error, whose correction is what the live captions heard, is excused as
 * recognisersDisagree and the re-ask (7 -> 8) stands.
 */
export const SOUND_ALIKE_DIFFERENT_WORD = soundAlikeCase(
  withSpokenTopic2Q2(
    "Le soir nous préparons le dîner ensemble et je mange un pomme avec du fromage, puis nous regardons un match de football à la télé avec ses parents dans le salon pendant une heure ou deux avant de faire nos devoirs pour le lendemain.",
    "le soir nous préparons le dîner ensemble et je mange une pomme avec du fromage puis nous regardons un match de football à la télé avec ses parents dans le salon pendant une heure ou deux avant de faire nos devoirs pour le lendemain",
  ),
  qolReply(7, [t2q2Error('un pomme', 'une pomme')]),
  qolReply(8, []),
);

/**
 * A live-captions fallback (Whisper timed out): one recogniser, so every
 * Category B word is uncertain and "de pain" -> "du pain" is excused. The
 * re-ask then fails: the first mark stands, minus the excused error, and the
 * guardrail flags that the mark may still carry its penalty.
 */
export const SOUND_ALIKE_FALLBACK_TURN = soundAlikeCase(
  withSpokenTopic2Q2(
    "Le week-end je mange de pain avec ma famille au petit déjeuner et après nous allons au marché ensemble pour acheter des fruits et des légumes pour toute la semaine, puis nous rentrons à pied et nous préparons un grand repas pour mes grands-parents.",
    null,
  ),
  qolReply(7, [t2q2Error('je mange de pain', 'je mange du pain')]),
  'failed',
);

/** The fallback case's transcription block: nine answers read by Whisper, this one from the live captions. */
export const SOUND_ALIKE_FALLBACK_TRANSCRIPTION: EnvelopeTranscription = {
  primaryTurns: 9,
  fallbackTurns: 1,
  reasons: { 'asr-timeout': 1 },
  model: 'whisper-large-v3',
  promptVersion: 'exam-asr-prompt-v1',
};
