import type { ExaminerVerdict } from '../types';

export const scoreColor = (val: number): string =>
  val >= 8 ? '#10B981' : val >= 6 ? '#F59E0B' : '#EF4444';

export function scoreToBand(score: number): ExaminerVerdict['predictedBand'] {
  if (score >= 8.5) return 'Extended-High';
  if (score >= 7)   return 'Extended-Mid';
  if (score >= 5.5) return 'Core-Secure';
  if (score >= 4)   return 'Core-Developing';
  if (score >= 2.5) return 'Foundation-Secure';
  return 'Foundation-Developing';
}

export function bandToAdvice(band: ExaminerVerdict['predictedBand']): string {
  switch (band) {
    case 'Foundation-Developing': return "Focus on sentence length and basic accuracy — aim for 30+ words.";
    case 'Foundation-Secure':     return "Add one tense beyond present (past or future) to reach Core bands.";
    case 'Core-Developing':       return "Eliminate elision/auxiliary errors and add an opinion phrase.";
    case 'Core-Secure':           return "One correct conditional or subjunctive sentence moves you to Extended.";
    case 'Extended-Mid':          return "Aim for zero major errors; add a sophisticated connector (cependant, néanmoins).";
    case 'Extended-High':         return "Refine register — eliminate all minor slips and vary sentence openings.";
  }
}
