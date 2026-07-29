import type { FeedbackV2, ExpansionLevel, CoachingLayer } from '../../types';

export function classifyTier(transcript: string): 0 | 1 | 2 | 3 {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  if (words.length <= 3) return 1;
  if (words.length <= 25) return 2;
  return 3;
}

export function buildExpansionLevels(word: string): ExpansionLevel[] {
  const w = word.replace(/[.,!?;:]/g, '').trim().toLowerCase();
  const isInfinitive = /\w{2,}(?:er|ir|re)$/i.test(w);

  if (isInfinitive) {
    return [
      { level: 1, sentence: `J'aime ${w}.`, addedWhat: 'subject + verb + topic' },
      { level: 2, sentence: `J'aime ${w} avec mes amis.`, addedWhat: 'added who' },
      { level: 3, sentence: `J'aime ${w} avec mes amis parce que c'est vraiment amusant.`, addedWhat: 'added reason' },
    ];
  }

  return [
    { level: 1, sentence: `J'aime ${w}.`, addedWhat: 'subject + verb + topic' },
    { level: 2, sentence: `J'aime ${w} parce que c'est intéressant.`, addedWhat: 'added reason' },
    { level: 3, sentence: `J'apprécie vraiment ${w} parce que c'est enrichissant et motivant.`, addedWhat: 'upgraded verb + richer reason' },
  ];
}

function _buildTier1CoachingLayer(word: string, wordCount: number): CoachingLayer {
  const displayWord = word || 'ce mot';
  return {
    teacher: `You identified a topic with '${displayWord}' — you're thinking in the right direction.`,
    examiner: `I can see the student is attempting to communicate, but ${wordCount === 1 ? 'a single word' : `only ${wordCount} words`} cannot earn Communication or Language marks. There is no complete sentence structure, no tense, and no developed idea to assess.`,
    coach: `Turn '${displayWord}' into a sentence — add a subject, a verb, and a reason. Even 'J'aime ${displayWord} parce que…' immediately earns marks.`,
  };
}

export function buildTier0Result(): FeedbackV2 {
  return {
    responseTier: 0,
    unscored: 'below_assessable_length',
    scores: { overall: 0, communication: 0, language: 0, fluency: 0 },
    grammar: { critical: [], polish: [] },
    vocabulary: [],
    style: [],
    fillers: [],
    wordCount: 0,
    cefrLevel: 'A1',
    schemaVersion: 2,
    issues: [],
    avoidanceReport: [],
    vocabularyV2: [],
  };
}

export function buildTier1LocalResult(transcript: string): FeedbackV2 {
  const rawWord = transcript.trim().split(/\s+/)[0] ?? transcript.trim();
  const word = rawWord.replace(/[.,!?;:]/g, '');
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const expansionLevels = buildExpansionLevels(word);
  const coachingLayer = _buildTier1CoachingLayer(word, wordCount);

  return {
    responseTier: 1,
    unscored: 'below_assessable_length',
    expansionLevels,
    coachingLayer,
    scores: { overall: 0, communication: 0, language: 0, fluency: 0 },
    grammar: { critical: [], polish: [] },
    vocabulary: [],
    style: [],
    fillers: [],
    wordCount,
    cefrLevel: 'A1',
    schemaVersion: 2,
    issues: [],
    avoidanceReport: [],
    vocabularyV2: [],
  };
}
