import type { TimeFrame, TimeFrameAlignment } from './types';

const PAST_CUES = [
  'recemment',
  'récemment',
  'la semaine derniere',
  'la semaine dernière',
  'hier',
  'l annee derniere',
  "l'année dernière",
  'avant',
];

const PRESENT_CUES = ["d'habitude", 'd habitude', 'en ce moment', "aujourd'hui", 'maintenant'];
const FUTURE_CUES = ['a l avenir', "à l'avenir", 'demain', 'plus tard', 'la semaine prochaine'];
const CONDITIONAL_CUES = ['aimerais-tu', 'aimerais tu', 'si tu pouvais', 'voudrais-tu', 'voudrais tu'];

const AVOIR_FORMS = new Set(['ai', 'as', 'a', 'avons', 'avez', 'ont']);
const ETRE_FORMS = new Set(['suis', 'es', 'est', 'sommes', 'etes', 'êtes', 'sont']);
const ALLER_FORMS = new Set(['vais', 'vas', 'va', 'allons', 'allez', 'vont']);

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, ' ')
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

function isLikelyParticiple(word: string): boolean {
  return /(e|es|ee|ees|i|is|ie|ies|u|us|ue|ues)$/.test(word);
}

function isLikelyInfinitive(word: string): boolean {
  return /(er|ir|re)$/.test(word);
}

function isLikelyConditional(word: string): boolean {
  return /(rais|rait|rions|riez|raient)$/.test(word);
}

function isLikelyImparfait(word: string): boolean {
  if (word.length <= 4 && /(ais|ait)$/.test(word)) {
    return false;
  }
  return /(ais|ait|ions|iez|aient)$/.test(word);
}

function isLikelyFutureSimple(word: string): boolean {
  return /(rai|ras|ra|rons|rez|ront)$/.test(word);
}

export function classifyResponseTimeFrame(text: string): TimeFrame | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  // Prioritize conditional before imperfect because of -rais / -ais overlap.
  if (tokens.some((token) => isLikelyConditional(token))) return 'conditional';

  for (let i = 0; i < tokens.length - 1; i += 1) {
    if (ALLER_FORMS.has(tokens[i]) && isLikelyInfinitive(tokens[i + 1])) {
      return 'future';
    }
  }

  if (tokens.some((token) => isLikelyFutureSimple(token))) return 'future';

  for (let i = 0; i < tokens.length - 1; i += 1) {
    if ((AVOIR_FORMS.has(tokens[i]) || ETRE_FORMS.has(tokens[i])) && isLikelyParticiple(tokens[i + 1])) {
      return 'past';
    }
  }

  if (tokens.some((token) => isLikelyImparfait(token))) return 'past';

  // Present finite forms that avoid treating filler-only content as present.
  if (tokens.some((token) => AVOIR_FORMS.has(token) || ETRE_FORMS.has(token) || ALLER_FORMS.has(token))) {
    return 'present';
  }
  if (tokens.some((token) => /(e|es|ons|ez|ent)$/.test(token) && token.length >= 4)) {
    return 'present';
  }

  return null;
}

export function deriveExpectedTimeFrameFromCues(questionText: string): TimeFrame | null {
  const normalized = normalize(questionText);

  if (PAST_CUES.some((cue) => normalized.includes(cue))) return 'past';
  if (FUTURE_CUES.some((cue) => normalized.includes(cue))) return 'future';
  if (CONDITIONAL_CUES.some((cue) => normalized.includes(cue))) return 'conditional';
  if (PRESENT_CUES.some((cue) => normalized.includes(cue))) return 'present';

  return null;
}

export function detectTimeFrameAlignment(
  expectedTimeFrame: TimeFrame | null,
  responseText: string,
): { detectedTimeFrame: TimeFrame | null; alignment: TimeFrameAlignment } {
  const detectedTimeFrame = classifyResponseTimeFrame(responseText);
  if (detectedTimeFrame === null) {
    return { detectedTimeFrame, alignment: 'no_verb' };
  }

  if (expectedTimeFrame === null) {
    return { detectedTimeFrame, alignment: 'aligned' };
  }

  return {
    detectedTimeFrame,
    alignment: expectedTimeFrame === detectedTimeFrame ? 'aligned' : 'misaligned',
  };
}
