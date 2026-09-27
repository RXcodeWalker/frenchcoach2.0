import { describe, it, expect } from 'vitest';
import { RP_MARK_0, RP_MARK_1, RP_MARK_2, COMM_7_9 } from '../../canonical';
import {
  canonicalizeForMatch,
  normalizeForMatch,
  parseRolePlayCommunicationOutput,
  parseQualityOfLanguageOutput,
  buildTopicTurnCorpora,
  isQuoteGrounded,
  expectedMarkForPlacement,
  JudgementValidationError,
  descriptorsEqual,
} from '../schema';
import { buildValidAssessment, buildValidMainOutput, buildValidQolOutput, PRACTICE_TRANSCRIPT } from './fixtures';

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

describe('L2 parsers — happy path', () => {
  it('parses both valid judge outputs and derives totals', () => {
    const result = buildValidAssessment();

    expect(result.rolePlay.tasks).toHaveLength(5);
    expect(result.rolePlay.total).toBe(9); // 2+2+1+2+2
    expect(result.communication.mark).toBe(8);
    expect(result.qualityOfLanguage.mark).toBe(8);
    expect(result.total).toBe(25);
  });
});

describe('parseRolePlayCommunicationOutput — zod rejection', () => {
  it('rejects out-of-range role play mark', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].mark = 3 as 0 | 1 | 2;
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      JudgementValidationError,
    );
  });

  it('rejects band mark above 15', () => {
    const output = buildValidMainOutput();
    output.communication.mark = 16;
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      JudgementValidationError,
    );
  });

  it('rejects fewer than 5 role play tasks', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks = output.rolePlay.tasks.slice(0, 4);
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      JudgementValidationError,
    );
  });
});

describe('parseRolePlayCommunicationOutput — descriptor traceability', () => {
  it('accepts exact canonical descriptor', () => {
    const output = buildValidMainOutput();
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('accepts descriptor with collapsed whitespace and different case (near-miss)', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].descriptorApplied = 'the  information is communicated.';
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('rejects paraphrased descriptor (near-miss)', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[2].descriptorApplied = 'Errors get in the way of communication.';
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /descriptorApplied does not match canonical/,
    );
  });

  it('accepts several canonical bullets for the mark quoted together', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].descriptorApplied = RP_MARK_2.join(' ');
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
    output.rolePlay.tasks[0].descriptorApplied = `- ${RP_MARK_2[1]}\n- ${RP_MARK_2[0]}`;
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('rejects canonical bullets joined with extra, non-canonical words', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].descriptorApplied = `${RP_MARK_2[0]} Mostly fine. ${RP_MARK_2[1]}`;
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(/got: /);
  });

  it('rejects mixing a bullet from another mark into the sequence', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].descriptorApplied = `${RP_MARK_2[0]} ${RP_MARK_1[1]}`;
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(JudgementValidationError);
  });

  it('rejects descriptor from wrong mark band', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].descriptorApplied = RP_MARK_1[0];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      JudgementValidationError,
    );
  });
});

describe('parseRolePlayCommunicationOutput — evidence grounding (near-miss fixtures)', () => {
  it('accepts quote with collapsed double-space vs transcript double-space', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[1].evidenceSpans = [{ source: 'rolePlay', quote: 'deux croissants' }];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('accepts straight apostrophe quote when transcript has curly apostrophe', () => {
    const output = buildValidMainOutput();
    output.communication.evidenceSpans = [
      { source: 'topic1', quote: "j'ai joué au football" },
      { source: 'topic2', quote: 'Mon meilleur ami' },
    ];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('accepts quote with trailing period and wrapping quotes (edge-trim)', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].evidenceSpans = [{ source: 'rolePlay', quote: '"Bonjour madame."' }];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).not.toThrow();
  });

  it('rejects quote differing by accent only (near-miss)', () => {
    const output = buildValidMainOutput();
    output.communication.evidenceSpans = [
      { source: 'topic1', quote: "j'ai joue au football" },
      { source: 'topic2', quote: 'Mon meilleur ami' },
    ];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /evidence quote not grounded/,
    );
  });

  it('rejects quote that adds a word not in transcript', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].evidenceSpans = [
      { source: 'rolePlay', quote: 'Bonjour madame comment allez-vous' },
    ];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /evidence quote not grounded/,
    );
  });

  it('rejects empty / whitespace-only quote', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].evidenceSpans = [{ source: 'rolePlay', quote: '   ' }];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /evidence quote not grounded/,
    );
  });
});

describe('parseRolePlayCommunicationOutput — placement consistency', () => {
  it('rejects mark inconsistent with convincingly placement', () => {
    const output = buildValidMainOutput();
    output.communication.bestFitPlacement = 'convincingly';
    output.communication.mark = 8;
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /inconsistent with bestFitPlacement/,
    );
  });

  it('rejects mark outside declared band', () => {
    const output = buildValidQolOutput({ mark: 10 });
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /outside band/,
    );
  });
});

describe('parseRolePlayCommunicationOutput — structural invariants', () => {
  it('rejects wrong topic conversation order', () => {
    const badTranscript = {
      ...PRACTICE_TRANSCRIPT,
      topicConversations: [
        PRACTICE_TRANSCRIPT.topicConversations[1],
        PRACTICE_TRANSCRIPT.topicConversations[0],
      ] as typeof PRACTICE_TRANSCRIPT.topicConversations,
    };
    expect(() => parseRolePlayCommunicationOutput(buildValidMainOutput(), badTranscript)).toThrow(
      /topicConversations must be \[topic1, topic2\]/,
    );
  });

  it('rejects descriptor from wrong communication band', () => {
    const output = buildValidMainOutput();
    output.communication.descriptorsApplied = [COMM_7_9[0]];
    output.communication.band = { min: 10, max: 12, label: 'Good' };
    output.communication.mark = 11;
    output.communication.bestFitPlacement = 'adequately';
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /descriptorsApplied entry does not match/,
    );
  });
});

describe('descriptorsEqual', () => {
  it('matches canonical RP_MARK_2[0] with case/whitespace variants', () => {
    expect(descriptorsEqual(RP_MARK_2[0], 'the information is communicated.')).toBe(true);
  });
});

describe('parseRolePlayCommunicationOutput — per-task role-play marking (P0 step 4)', () => {
  it("rejects a role-play quote taken from another task's response", () => {
    const output = buildValidMainOutput();
    // 'Merci, au revoir' is t5's response, cited for t1.
    output.rolePlay.tasks[0].evidenceSpans = [{ source: 'rolePlay', quote: 'Merci, au revoir' }];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /rolePlay task t1: evidence quote not grounded in that task's response/,
    );
  });

  it('rejects a role-play quote taken from a topic conversation, whatever its source label', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[0].evidenceSpans = [{ source: 'topic1', quote: 'Je préfère le sport' }];
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(JudgementValidationError);
  });

  it('rejects duplicate taskIds even when five tasks are returned', () => {
    const output = buildValidMainOutput();
    output.rolePlay.tasks[4] = { ...output.rolePlay.tasks[0] };
    expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /Duplicate role play taskId: t1/,
    );
  });

  it('accepts a silent task marked 0 with no evidence spans', () => {
    const transcript = {
      ...PRACTICE_TRANSCRIPT,
      rolePlay: PRACTICE_TRANSCRIPT.rolePlay.map((t, i) => (i === 2 ? { ...t, candidateResponse: '' } : t)),
    };
    const output = buildValidMainOutput();
    output.rolePlay.tasks[2] = { taskId: 't3', mark: 0, descriptorApplied: RP_MARK_0[0], evidenceSpans: [] };
    const result = parseRolePlayCommunicationOutput(output, transcript);
    expect(result.rolePlay.tasks[2].mark).toBe(0);
    expect(result.rolePlay.total).toBe(8);
  });

  it('rejects a mark of 1 or 2 with no evidence spans', () => {
    for (const mark of [1, 2] as const) {
      const output = buildValidMainOutput();
      output.rolePlay.tasks[0] = {
        taskId: 't1',
        mark,
        descriptorApplied: mark === 2 ? RP_MARK_2[0] : RP_MARK_1[0],
        evidenceSpans: [],
      };
      expect(() => parseRolePlayCommunicationOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
        /evidenceSpans: mark \d requires at least one evidence span/,
      );
    }
  });
});

describe('parseRolePlayCommunicationOutput — scoring-prompt-v0.6 split', () => {
  it('does not require (or read) a qualityOfLanguage block', () => {
    const result = parseRolePlayCommunicationOutput(buildValidMainOutput(), PRACTICE_TRANSCRIPT);
    expect(result).not.toHaveProperty('qualityOfLanguage');
    expect(result.rolePlay.total).toBe(9);
    expect(result.communication.mark).toBe(8);
  });
});

describe('parseQualityOfLanguageOutput — error list with per-turn grounding', () => {
  const qolError = (overrides: Partial<ReturnType<typeof buildValidQolOutput>['errors'][number]>) => ({
    source: 'topic1' as const,
    turnId: 'q2',
    quote: 'Je préfère le sport',
    kind: 'grammar' as const,
    correction: 'Je préfère le sport',
    ...overrides,
  });

  it('parses a valid reply and keeps errors and errorFrequency', () => {
    const result = parseQualityOfLanguageOutput(buildValidQolOutput(), PRACTICE_TRANSCRIPT);
    expect(result.mark).toBe(8);
    expect(result.errors).toHaveLength(1);
    expect(result.errorFrequency).toBe('some errors');
  });

  it('accepts an empty errors list', () => {
    const output = buildValidQolOutput({ errors: [], errorFrequency: 'no errors' });
    expect(parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT).errors).toEqual([]);
  });

  it('records errorFrequency without enforcing any mapping to the band', () => {
    // 'almost always inaccurate' next to a 7–9 band: the judge's band call stands.
    const output = buildValidQolOutput({ errorFrequency: 'almost always inaccurate' });
    expect(parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT).mark).toBe(8);
  });

  it('rejects an ungrounded error quote', () => {
    const output = buildValidQolOutput({ errors: [qolError({ quote: 'je faire du sport' })] });
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(
      /error quote not grounded in that turn's candidate response/,
    );
  });

  it('rejects a rolePlay source on an error (schema enum excludes it)', () => {
    const output = { ...buildValidQolOutput(), errors: [qolError({ source: 'rolePlay' as 'topic1' })] };
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(/schema validation/);
  });

  it('rejects a rolePlay source on a QoL evidence span', () => {
    const output = {
      ...buildValidQolOutput(),
      evidenceSpans: [{ source: 'rolePlay', quote: 'Bonjour madame' }],
    };
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(/schema validation/);
  });

  it("rejects a quote that exists only in the examiner's questionPrompt", () => {
    // topic1 q2's question text, never said by the candidate.
    const output = buildValidQolOutput({ errors: [qolError({ quote: 'Do you prefer sport or cinema' })] });
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(JudgementValidationError);
  });

  it('rejects a quote that straddles two answers', () => {
    // End of topic1 q1 + start of topic1 q2 — grounded in the pooled topic corpus, not in either turn.
    const straddle = 'avec mes amis. Je préfère';
    expect(isQuoteGrounded(straddle, PRACTICE_TRANSCRIPT.topicConversations[0].turns.map((t) => t.candidateResponse).join(' '))).toBe(true);
    for (const turnId of ['q1', 'q2']) {
      const output = buildValidQolOutput({ errors: [qolError({ turnId, quote: straddle })] });
      expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(/not grounded in that turn/);
    }
  });

  it('rejects a real quote attributed to the wrong turnId', () => {
    // 'Je préfère le sport' is topic1 q2, cited as topic1 q1.
    const output = buildValidQolOutput({ errors: [qolError({ turnId: 'q1' })] });
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(/not grounded in that turn/);
  });

  it('rejects the right turnId in the other topic', () => {
    // topic2 also has a q2 ('Nous écoutons…'); the quote is topic1 q2's.
    const output = buildValidQolOutput({ errors: [qolError({ source: 'topic2' })] });
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(/not grounded in that turn/);
  });

  it('rejects an unknown turnId', () => {
    const output = buildValidQolOutput({ errors: [qolError({ turnId: 'q9' })] });
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(/unknown turn/);
  });

  it('an error message quotes only the rejected span, never other examiner text', () => {
    const output = buildValidQolOutput({ errors: [qolError({ quote: 'invented span' })] });
    expect(() => parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT)).toThrow(/"invented span"/);
    try {
      parseQualityOfLanguageOutput(output, PRACTICE_TRANSCRIPT);
    } catch (err) {
      for (const turn of PRACTICE_TRANSCRIPT.topicConversations.flatMap((c) => c.turns)) {
        expect((err as Error).message).not.toContain(turn.questionPrompt);
      }
    }
  });

  it('still validates the band block (descriptors, placement)', () => {
    expect(() =>
      parseQualityOfLanguageOutput(buildValidQolOutput({ bestFitPlacement: 'convincingly' }), PRACTICE_TRANSCRIPT),
    ).toThrow(/inconsistent with bestFitPlacement/);
    expect(() =>
      parseQualityOfLanguageOutput(buildValidQolOutput({ descriptorsApplied: [COMM_7_9[0]] }), PRACTICE_TRANSCRIPT),
    ).toThrow(/descriptorsApplied entry does not match/);
  });
});

describe('buildTopicTurnCorpora', () => {
  it('keys each turn by conversation and turn id, candidate text only', () => {
    const corpora = buildTopicTurnCorpora(PRACTICE_TRANSCRIPT);
    expect(corpora.size).toBe(4);
    expect(corpora.get('topic1:q2')).toBe('Je préfère le sport parce que c est amusant.');
    expect(corpora.get('topic2:q2')).toBe('Nous écoutons de la musique ensemble.');
  });
});
