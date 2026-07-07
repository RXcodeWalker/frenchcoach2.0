import type { SpeakingTranscript } from '../../judgement/types';

export const EVIDENCE_GOLDEN_TRANSCRIPT: SpeakingTranscript = {
  contentProvenance: 'original-practice',
  rolePlay: [
    {
      taskId: 't1',
      taskPrompt: 'Dis bonjour.',
      candidateResponse: 'Bonjour madame.',
      partsExpected: 1,
    },
    {
      taskId: 't2',
      taskPrompt: 'Demande le prix et paie.',
      candidateResponse: 'C est combien ? Je paie par carte.',
      partsExpected: 2,
    },
    {
      taskId: 't3',
      taskPrompt: 'Demande deux croissants.',
      candidateResponse: 'Je voudrais deux croissants, euh s il vous plait.',
      partsExpected: 1,
    },
    {
      taskId: 't4',
      taskPrompt: 'Remercie.',
      candidateResponse: 'Merci, au revoir.',
      partsExpected: 1,
    },
    {
      taskId: 't5',
      taskPrompt: 'Pose une question.',
      candidateResponse: 'Vous ouvrez a huit heures ?',
      partsExpected: 1,
    },
  ],
  topicConversations: [
    {
      conversationId: 'topic1',
      topicArea: 'A',
      turns: [
        {
          turnId: 'q1',
          questionPrompt: "Qu'est-ce que tu as fait la semaine dernière ?",
          expectedTimeFrame: 'past',
          candidateResponse: "La semaine derniere, j'ai mangé au restaurant.",
        },
        {
          turnId: 'q2',
          questionPrompt: 'A l avenir, que vas-tu faire ?',
          expectedTimeFrame: 'future',
          candidateResponse: 'Je vais visiter Paris.',
        },
      ],
    },
    {
      conversationId: 'topic2',
      topicArea: 'B',
      turns: [
        {
          turnId: 'q1',
          questionPrompt: 'Si tu pouvais choisir, que ferais-tu ?',
          expectedTimeFrame: 'conditional',
          candidateResponse: 'Je choisirais un voyage en France.',
        },
        {
          turnId: 'q2',
          questionPrompt: "D'habitude, que fais-tu le weekend ?",
          expectedTimeFrame: 'present',
          candidateResponse: 'Je joue au foot avec mes amis, alors c est super.',
        },
      ],
    },
  ],
};

export const ADVERSARIAL_TIMEFRAME_CASES = [
  { name: "c'etait past opinion", response: "C'était super.", expected: 'past' as const },
  { name: "c'est present opinion", response: "C'est super.", expected: 'present' as const },
  { name: "j'ai faim is present", response: "J'ai faim.", expected: 'present' as const },
  { name: "j'ai mangé is past", response: "J'ai mangé.", expected: 'past' as const },
  { name: 'je venais is past', response: 'Je venais en bus.', expected: 'past' as const },
  { name: 'vous venez is present', response: 'Vous venez demain ?', expected: 'present' as const },
  { name: 'futur proche', response: 'Je vais manger plus tard.', expected: 'future' as const },
  { name: 'literal present aller', response: "Je vais à l'école.", expected: 'present' as const },
  { name: 'imparfait -ais', response: 'Je jouais au tennis.', expected: 'past' as const },
  { name: 'conditionnel -rais', response: 'Je jouerais au tennis.', expected: 'conditional' as const },
] as const;
