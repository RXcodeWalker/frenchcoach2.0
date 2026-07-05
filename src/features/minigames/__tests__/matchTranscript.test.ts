import { describe, it, expect } from 'vitest';
import {
  getRelevantTranscript,
  matchTranscript,
  matchTranscriptDelta,
} from '../utils/matchTranscript';

describe('getRelevantTranscript', () => {
  it('returns full normalized transcript when last checked is empty', () => {
    expect(getRelevantTranscript('Bonjour tout le monde', '')).toBe(
      'bonjour tout le monde'
    );
  });

  it('strips the previously checked portion', () => {
    expect(
      getRelevantTranscript('bonjour comment allez vous', 'bonjour')
    ).toBe(' comment allez vous');
  });

  it('normalizes before slicing', () => {
    expect(
      getRelevantTranscript('Bonjour! Comment ça va?', 'bonjour')
    ).toBe(' comment ca va');
  });
});

describe('matchTranscript (substring)', () => {
  it('matches when phrase appears in transcript', () => {
    expect(matchTranscript('je voudrais un café', 'un cafe')).toBe(true);
  });

  it('matches any acceptable variant', () => {
    expect(matchTranscript('oui merci', ['non', 'oui'])).toBe(true);
  });

  it('rejects when phrase is absent', () => {
    expect(matchTranscript('bonjour', 'au revoir')).toBe(false);
  });
});

describe('matchTranscriptDelta', () => {
  it('matches only new speech since last check', () => {
    expect(
      matchTranscriptDelta('bonjour je mange', 'bonjour', 'je mange')
    ).toBe(true);
  });

  it('ignores phrase already spoken before last check', () => {
    expect(
      matchTranscriptDelta('bonjour je mange', 'bonjour je', 'je mange')
    ).toBe(false);
  });
});

describe('matchTranscript (fuzzy)', () => {
  it('matches via dice coefficient above threshold', () => {
    expect(
      matchTranscript('je mang', 'je mange', { mode: 'fuzzy' })
    ).toBe(true);
  });

  it('matches word-by-word with short-word skip', () => {
    expect(
      matchTranscriptDelta(
        'je vais au parc',
        '',
        'je vais la',
        { mode: 'fuzzy' }
      )
    ).toBe(true);
  });
});
