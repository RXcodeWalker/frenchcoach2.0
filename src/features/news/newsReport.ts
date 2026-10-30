import type { NewsSnippet } from '../../data/mocks/mockNews';

export interface NewsReportStats {
  /** 0–10: keyword coverage (60%) blended with answer length (40%). */
  overall: number;
  foundKeywords: string[];
  missedKeywords: string[];
}

/** Which of the story's keywords a (possibly still-live) transcript already contains. */
export function keywordsHeard(transcript: string, keywords: string[]): string[] {
  const lower = transcript.toLowerCase();
  return keywords.filter(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Daily News Flash's own relevance score (it drives Session.score and XP; the
 * AI feedback's language/fluency scores are left untouched). Length target is
 * roughly 20–40 spoken words.
 */
export function evaluateNewsReport(transcript: string, news: Pick<NewsSnippet, 'keywords'>): NewsReportStats {
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const foundKeywords = keywordsHeard(transcript, news.keywords);
  const missedKeywords = news.keywords.filter(kw => !foundKeywords.includes(kw));
  const keywordScore = news.keywords.length > 0 ? (foundKeywords.length / news.keywords.length) * 10 : 0;
  const lengthScore = wordCount > 40 ? 10 : wordCount > 20 ? 8 : wordCount > 10 ? 5 : 2;
  const overall = Math.min(10, keywordScore * 0.6 + lengthScore * 0.4);
  return { overall: Math.round(overall * 10) / 10, foundKeywords, missedKeywords };
}

/** XP for a report: 2.5 per point, capped at 5 for a near-empty or off-topic answer. */
export function newsReportXp(overall: number, wordCount: number): number {
  const xp = Math.round(overall * 2.5);
  return wordCount < 5 || overall < 3 ? Math.min(xp, 5) : xp;
}

/** Splits a broadcast into sentences so the transcript reads as lines, not a wall. */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
}
