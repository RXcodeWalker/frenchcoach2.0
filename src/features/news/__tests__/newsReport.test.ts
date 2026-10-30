import { describe, expect, it } from 'vitest';
import { evaluateNewsReport, keywordsHeard, newsReportXp, splitSentences } from '../newsReport';

const news = { keywords: ['festival', 'cinéma', 'Cannes'] };

describe('evaluateNewsReport', () => {
  it('matches keywords case-insensitively and lists the missed ones', () => {
    const r = evaluateNewsReport('Le FESTIVAL de cannes', news);
    expect(r.foundKeywords).toEqual(['festival', 'Cannes']);
    expect(r.missedKeywords).toEqual(['cinéma']);
  });

  it('blends 60% keywords with 40% length', () => {
    const words = Array(41).fill('festival cinéma Cannes').join(' ');
    expect(evaluateNewsReport(words, news).overall).toBe(10);
    expect(evaluateNewsReport('festival', news).overall).toBe(2.8);
  });

  it('does not divide by zero with no keywords', () => {
    expect(Number.isFinite(evaluateNewsReport('bonjour', { keywords: [] }).overall)).toBe(true);
  });
});

describe('newsReportXp', () => {
  it('is 2.5 per point', () => expect(newsReportXp(8, 30)).toBe(20));
  it('caps a tiny or off-topic answer at 5', () => {
    expect(newsReportXp(9, 3)).toBe(5);
    expect(newsReportXp(2, 30)).toBe(5);
  });
});

describe('helpers', () => {
  it('keywordsHeard works on a live partial transcript', () => {
    expect(keywordsHeard('il y a un festival', news.keywords)).toEqual(['festival']);
  });
  it('splits sentences', () => {
    expect(splitSentences('Un. Deux ! Trois?')).toEqual(['Un.', 'Deux !', 'Trois?']);
  });
});
