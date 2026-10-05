import { describe, expect, it } from 'vitest';
import { claimMentionsMarkOrBand } from '../../examFeedback/shared/markClaimFilter';
import { buildFluencyNote } from '../fluencyNote';

describe('fluency note', () => {
  it('describes long pauses from the untrimmed pause stats', () => {
    const note = buildFluencyNote({
      pauseStats: [{ pausesOver2s: 1, longestPauseS: 2.4 }, { pausesOver2s: 2, longestPauseS: 3.6 }],
      transcripts: ['Je suis allé au parc.', 'Demain je vais jouer.'],
    });
    expect(note).toBe('You stopped for more than 2 seconds 3 times, the longest for about 4 seconds.');
  });

  it('says so when there was no long pause, and adds fillers', () => {
    const note = buildFluencyNote({
      pauseStats: [{ pausesOver2s: 0, longestPauseS: 1.2 }],
      transcripts: ['Euh je suis euh allé au parc.'],
    });
    expect(note).toBe('You kept talking without stopping for more than 2 seconds, and you used fillers such as "euh" 2 times.');
  });

  it('is null when there is nothing honest to say', () => {
    expect(buildFluencyNote({ pauseStats: [null], transcripts: ['Je suis allé au parc.'] })).toBeNull();
    expect(buildFluencyNote({ pauseStats: [null], transcripts: ['Euh oui.'] })).toBe('You used fillers such as "euh" 1 time.');
  });

  it('never reads as a mark, band or level', () => {
    for (const stats of [[{ pausesOver2s: 0, longestPauseS: 0 }], [{ pausesOver2s: 9, longestPauseS: 15 }]]) {
      const note = buildFluencyNote({ pauseStats: stats, transcripts: ['euh'] })!;
      expect(claimMentionsMarkOrBand(note)).toBe(false);
      expect(note).not.toMatch(/level|fluent|band|score/i);
    }
  });
});
