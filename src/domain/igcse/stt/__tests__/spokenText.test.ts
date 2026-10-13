import { describe, expect, it } from 'vitest';
import { joinMarked, markSpokenText, markUtterance, wordCount } from '../project/spokenText';
import type { Utterance } from '../types';

function utterance(over: Partial<Utterance>): Utterance {
  return {
    utteranceId: 'u1',
    role: 'candidate',
    speakerCluster: 'candidate',
    part: 'topic1',
    questionId: 'q1',
    startS: 0,
    endS: 3,
    text: '',
    words: [],
    ...over,
  };
}

describe('markSpokenText — two recognisers', () => {
  it('respells Category A to the context spelling, so the marker sees "Il mange"', () => {
    const marked = markSpokenText("J'ai un frère. Ils mangent beaucoup.", "J'ai un frère. Ils mangent beaucoup.");
    expect(marked.text).toBe("J'ai un frère. Il mange beaucoup.");
    expect(marked.spans).toEqual([]);
  });

  it('a Category B disagreement is one nearHomophone span with the other reading', () => {
    const marked = markSpokenText('Ils ont un chien', 'Ils sont en chien');
    expect(marked.text).toBe('Ils ont un chien');
    expect(marked.spans).toEqual([
      {
        kind: 'nearHomophone',
        basis: 'disagreement',
        start: 1,
        end: 3,
        heard: 'ont un',
        alternatives: ['sont en'],
        pairIds: ['ont~sont', 'un~en'],
      },
    ]);
  });

  it('a Category B word both recognisers agree on is not uncertain (an agreed wrong word counts)', () => {
    expect(markSpokenText("J'ai en chien", "j'ai en chien").spans).toEqual([]);
  });

  it('a clearly different word is a `different` span (audit only)', () => {
    const [span] = markSpokenText("J'ai un chien", "J'ai un chat").spans;
    expect(span).toMatchObject({ kind: 'different', basis: 'disagreement', heard: 'chien', alternatives: ['chat'] });
  });

  it('never changes the word count', () => {
    const input = 'Hier ils ont mangé des pommes et il est allé au parc.';
    expect(wordCount(markSpokenText(input, input).text)).toBe(wordCount(input));
  });
});

describe('markSpokenText — one recogniser', () => {
  it('lists every Category B word as uncertain, with its partners', () => {
    const marked = markSpokenText("Je mange de la soupe et j'ai un chien", null);
    expect(marked.spans.map((s) => [s.heard, s.alternatives, s.basis])).toEqual([
      ['Je', ["j'ai"], 'single-recogniser'],
      ['de', ['des', 'du'], 'single-recogniser'],
      ["j'ai", ['je'], 'single-recogniser'],
      ['un', ['en'], 'single-recogniser'],
    ]);
  });

  it('a blank second reading is the same as none', () => {
    expect(markSpokenText('Ils ont un chien', '  ')).toEqual(markSpokenText('Ils ont un chien', null));
  });

  it('still respells Category A', () => {
    expect(markSpokenText("J'ai un frère. Ils mangent.", null).text).toBe("J'ai un frère. Il mange.");
  });
});

describe('markUtterance', () => {
  it('passes a typed answer through verbatim, with no spans', () => {
    const marked = markUtterance(utterance({ text: 'Ils mangent un pomme', inputMode: 'text' }));
    expect(marked).toEqual({ text: 'Ils mangent un pomme', spans: [], spoken: false });
  });

  it('compares a batch reading with the live captions', () => {
    const marked = markUtterance(
      utterance({
        text: 'Ils ont un chien',
        inputMode: 'speech',
        recognition: {
          primary: { text: 'Ils ont un chien', model: 'm', promptHash: 'h', segments: [] },
          secondary: { source: 'web-speech-live', text: 'Ils sont en chien' },
          selected: 'primary',
          fallbackReason: null,
        },
      }),
    );
    expect(marked.spoken).toBe(true);
    expect(marked.spans[0].basis).toBe('disagreement');
  });

  it('treats a live-captions fallback as a single-recogniser reading', () => {
    const marked = markUtterance(
      utterance({
        text: 'Ils sont en chien',
        inputMode: 'speech',
        recognition: {
          primary: { text: 'Merci.', model: 'm', promptHash: 'h', segments: [] },
          secondary: { source: 'web-speech-live', text: 'Ils sont en chien' },
          selected: 'secondary',
          fallbackReason: 'asr-rejected',
        },
      }),
    );
    expect(marked.spans.every((s) => s.basis === 'single-recogniser')).toBe(true);
    expect(marked.spans.map((s) => s.heard)).toEqual(['sont', 'en']);
  });

  it('treats a spoken answer with no recognition record (older transcript, recording) as single-recogniser', () => {
    const marked = markUtterance(utterance({ text: 'Le chien', inputMode: 'speech' }));
    expect(marked.spans).toHaveLength(1);
    expect(markUtterance(utterance({ text: 'Le chien' })).spoken).toBe(true);
  });
});

describe('joinMarked', () => {
  it('shifts each part’s spans to the joined text', () => {
    const joined = joinMarked([markSpokenText('Bonjour madame', null), markSpokenText('Je voudrais un café', null)]);
    expect(joined.text).toBe('Bonjour madame Je voudrais un café');
    expect(joined.spans.map((s) => [s.start, s.heard])).toEqual([
      [2, 'Je'],
      [4, 'un'],
    ]);
  });
});
