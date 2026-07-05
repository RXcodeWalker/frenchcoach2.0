import { normalizeFrench } from './normalizeFrench';

export function normalizeAcceptableAnswers(french: string | string[]): string[] {
  return Array.isArray(french) ? french.map(normalizeFrench) : [normalizeFrench(french)];
}

export function matchTypedAnswer(
  userInput: string,
  acceptable: string | string[]
): boolean {
  const normalizedInput = normalizeFrench(userInput);
  const normalizedAcceptable = normalizeAcceptableAnswers(acceptable);
  return normalizedAcceptable.includes(normalizedInput);
}
