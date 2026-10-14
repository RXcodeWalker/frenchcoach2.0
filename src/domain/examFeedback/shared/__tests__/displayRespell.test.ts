import { describe, expect, it } from 'vitest';
import { markUtterance } from '../../../igcse/stt/project/spokenText';
import type { Utterance } from '../../../igcse/stt/types';
import { displayRespell } from '../displayRespell';

function utterance(text: string, inputMode: 'speech' | 'text'): Utterance {
  return {
    utteranceId: 'u1',
    role: 'candidate',
    speakerCluster: 'spk1',
    part: 'topic1',
    questionId: 'topic1:t1q1',
    startS: 0,
    endS: 1,
    text,
    words: [],
    inputMode,
  };
}

describe('displayRespell', () => {
  it("shows a spoken answer in the context-consistent spelling, as the marker read it", () => {
    expect(displayRespell(utterance("J'ai un frère. Ils mange beaucoup.", 'speech'))).toBe("J'ai un frère. Il mange beaucoup.");
  });

  it('is exactly what the marker reads (one implementation)', () => {
    const u = utterance('Il et content.', 'speech');
    expect(displayRespell(u)).toBe(markUtterance(u).text);
  });

  it('never touches a typed answer', () => {
    expect(displayRespell(utterance("J'ai un frère. Ils mange beaucoup.", 'text'))).toBe("J'ai un frère. Ils mange beaucoup.");
  });

  it('keeps the word count (only a spelling changes)', () => {
    const text = 'Il et content et il mangent.';
    expect(displayRespell(utterance(text, 'speech')).split(/\s+/)).toHaveLength(text.split(/\s+/).length);
  });
});
