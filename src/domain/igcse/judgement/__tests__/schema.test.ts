import { describe, it, expect } from 'vitest';
import { RP_MARK_1, RP_MARK_2, COMM_7_9 } from '../../canonical';
import {
  canonicalizeForMatch,
  normalizeForMatch,
  parseAndValidateJudgeOutput,
  isQuoteGrounded,
  expectedMarkForPlacement,
  JudgementValidationError,
  descriptorsEqual,
} from '../schema';
import { buildValidJudgeOutput, PRACTICE_TRANSCRIPT } from './fixtures';

describe('normalizeForMatch / canonicalizeForMatch', () => {
  it('collapses double whitespace', () => {
    expect(normalizeForMatch('deux  croissants')).toBe('deux croissants');
  });

  it('unifies curly and straight apostrophes', () => {
    const curly = `j\u2019ai`;
    const straight = "j'ai";
    expect(normalizeForMatch(curly)).toBe(normalizeForMatch(straight));
  });

  it('is case-insensitive', () => {
    expect(normalizeForMatch('Bonjour')).toBe('bonjour');
  });

  it('preserves accents (mange !== mangé)', () => {
    expect(normalizeForMatch('mange')).not.toBe(normalizeForMatch('mangé'));
  });

  it('canonicalizeForMatch strips edge punctuation', () => {
    expect(canonicalizeForMatch('"Bonjour madame."')).toBe('bonjour madame');
  });
});

describe('expectedMarkForPlacement', () => {
  it('maps convincingly/adequately/just for width-3 bands', () => {
    const band = { min: 7, max: 9 };
    expect(expectedMarkForPlacement(band, 'convincingly')).toBe(9);
    expect(expectedMarkForPlacement(band, 'adequately')).toBe(8);
    expect(expectedMarkForPlacement(band, 'just')).toBe(7);
  });

  it('maps all placements to min for zero-width band', () => {
    const band = { min: 0, max: 0 };
    expect(expectedMarkForPlacement(band, 'convincingly')).toBe(0);
    expect(expectedMarkForPlacement(band, 'adequately')).toBe(0);
    expect(expectedMarkForPlacement(band, 'just')).toBe(0);
  });
});

describe('isQuoteGrounded', () => {
  it('accepts substring quotes', () => {
    expect(isQuoteGrounded('Bonjour madame', 'Bonjour madame.')).toBe(true);
  });

  it('rejects quotes not in corpus', () => {
    expect(isQuoteGrounded('invented phrase', PRACTICE_TRANSCRIPT.rolePlay[0].candidateResponse)).toBe(
      false,
    );
  });

  it('rejects empty quotes', () => {
    expect(isQuoteGrounded('   ', 'anything')).toBe(false);
    expect(isQuoteGrounded('', 'anything')).toBe(false);
  });
});

describe('parseAndValidateJudgeOutput — happy path', () => {
  it('parses valid judge output and derives totals', () => {
    const output = buildValidJudgeOutput();
    const result = parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT);

    expect(result.rolePlay.tasks).toHaveLength(5);
    expect(result.rolePlay.total).toBe(9); // 2+2+1+2+2
    expect(result.communication.mark).toBe(8);
    expect(result.qualityOfLanguage.mark).toBe(8);
    expect(result.total).toBe(25);
  });
});

describe('parseAndValidateJudgeOutput — zod rejection', () => {
  it('rejects out-of-range role play mark', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[0].mark = 3 as 0 | 1 | 2;
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      JudgementValidationError,
    );
  });

  it('rejects band mark above 15', () => {
    const output = buildValidJudgeOutput();
    output.communication.mark = 16;
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      JudgementValidationError,
    );
  });

  it('rejects fewer than 5 role play tasks', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks = output.rolePlay.tasks.slice(0, 4);
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      JudgementValidationError,
    );
  });
});

describe('parseAndValidateJudgeOutput — descriptor traceability', () => {
  it('accepts exact canonical descriptor', () => {
    const output = buildValidJudgeOutput();
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('accepts descriptor with collapsed whitespace and different case (near-miss)', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[0].descriptorApplied = 'the  information is communicated.';
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('rejects paraphrased descriptor (near-miss)', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[2].descriptorApplied = 'Errors get in the way of communication.';
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /descriptorApplied does not match canonical/,
    );
  });

  it('rejects descriptor from wrong mark band', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[0].descriptorApplied = RP_MARK_1[0];
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      JudgementValidationError,
    );
  });
});

describe('parseAndValidateJudgeOutput — evidence grounding (near-miss fixtures)', () => {
  it('accepts quote with collapsed double-space vs transcript double-space', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[1].evidenceSpans = [{ source: 'rolePlay', quote: 'deux croissants' }];
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('accepts straight apostrophe quote when transcript has curly apostrophe', () => {
    const output = buildValidJudgeOutput();
    output.communication.evidenceSpans = [
      { source: 'topic1', quote: "j'ai joué au football" },
      { source: 'topic2', quote: 'Mon meilleur ami' },
    ];
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('accepts quote with trailing period and wrapping quotes (edge-trim)', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[0].evidenceSpans = [{ source: 'rolePlay', quote: '"Bonjour madame."' }];
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('rejects quote differing by accent only (near-miss)', () => {
    const output = buildValidJudgeOutput();
    output.communication.evidenceSpans = [
      { source: 'topic1', quote: "j'ai joue au football" },
      { source: 'topic2', quote: 'Mon meilleur ami' },
    ];
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /evidence quote not grounded/,
    );
  });

  it('rejects quote that adds a word not in transcript', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[0].evidenceSpans = [
      { source: 'rolePlay', quote: 'Bonjour madame comment allez-vous' },
    ];
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /evidence quote not grounded/,
    );
  });

  it('rejects empty / whitespace-only quote', () => {
    const output = buildValidJudgeOutput();
    output.rolePlay.tasks[0].evidenceSpans = [{ source: 'rolePlay', quote: '   ' }];
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /evidence quote not grounded/,
    );
  });
});

describe('parseAndValidateJudgeOutput — placement consistency', () => {
  it('rejects mark inconsistent with convincingly placement', () => {
    const output = buildValidJudgeOutput();
    output.communication.bestFitPlacement = 'convincingly';
    output.communication.mark = 8;
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /inconsistent with bestFitPlacement/,
    );
  });

  it('rejects mark outside declared band', () => {
    const output = buildValidJudgeOutput();
    output.qualityOfLanguage.mark = 10;
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /outside band/,
    );
  });
});

describe('parseAndValidateJudgeOutput — structural invariants', () => {
  it('rejects wrong topic conversation order', () => {
    const badTranscript = {
      ...PRACTICE_TRANSCRIPT,
      topicConversations: [
        PRACTICE_TRANSCRIPT.topicConversations[1],
        PRACTICE_TRANSCRIPT.topicConversations[0],
      ] as typeof PRACTICE_TRANSCRIPT.topicConversations,
    };
    expect(() => parseAndValidateJudgeOutput(buildValidJudgeOutput(), badTranscript)).toThrow(
      /topicConversations must be \[topic1, topic2\]/,
    );
  });

  it('rejects descriptor from wrong communication band', () => {
    const output = buildValidJudgeOutput();
    output.communication.descriptorsApplied = [COMM_7_9[0]];
    output.communication.band = { min: 10, max: 12, label: 'Good' };
    output.communication.mark = 11;
    output.communication.bestFitPlacement = 'adequately';
    expect(() => parseAndValidateJudgeOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /descriptorsApplied entry does not match/,
    );
  });
});

describe('descriptorsEqual', () => {
  it('matches canonical RP_MARK_2[0] with case/whitespace variants', () => {
    expect(descriptorsEqual(RP_MARK_2[0], 'the information is communicated.')).toBe(true);
  });
});
