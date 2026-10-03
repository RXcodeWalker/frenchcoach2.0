import { describe, expect, it } from 'vitest';
import { FIXTURE_IDS, loadAllFixtures, loadFixture } from '../fixtures';
import { allExpectationsPassed, evaluateExpectation } from '../passBar';

describe('judge:check fixtures', () => {
  it('every fixture id in FIXTURE_IDS parses', () => {
    for (const id of FIXTURE_IDS) {
      expect(() => loadFixture(id)).not.toThrow();
    }
  });

  it('every fixture has exactly 5 role-play tasks and 2 topic conversations of 2 turns each', () => {
    for (const fixture of loadAllFixtures()) {
      expect(fixture.transcript.rolePlay).toHaveLength(5);
      expect(fixture.transcript.topicConversations).toHaveLength(2);
      for (const conv of fixture.transcript.topicConversations) {
        expect(conv.turns).toHaveLength(2);
      }
    }
  });

  it('every fixture is original-practice content', () => {
    for (const fixture of loadAllFixtures()) {
      expect(fixture.transcript.contentProvenance).toBe('original-practice');
    }
  });

  it('the four gated fixtures each carry an expect block', () => {
    const gated = ['weak', 'strong', 'split-a-strong-comm-poor-grammar', 'split-b-accurate-minimal'];
    for (const id of gated) {
      const fixture = loadFixture(id);
      expect(fixture.expect).toBeDefined();
      expect(Object.keys(fixture.expect ?? {}).length).toBeGreaterThan(0);
    }
  });

  it('a fixture id must match its file name', () => {
    const fixture = loadFixture('weak');
    expect(fixture.id).toBe('weak');
  });

  it('every -reconstructed fixture carries no expect block (reported only, never gated)', () => {
    for (const id of FIXTURE_IDS) {
      if (!id.endsWith('-reconstructed')) continue;
      const fixture = loadFixture(id);
      expect(fixture.expect === undefined || Object.keys(fixture.expect).length === 0).toBe(true);
    }
  });

  it('split-a-strong-comm-poor-grammar carries auditErrors grounded in its own transcript', () => {
    const fixture = loadFixture('split-a-strong-comm-poor-grammar');
    expect(fixture.auditErrors).toBeDefined();
    expect(fixture.auditErrors).toHaveLength(5);
    for (const audit of fixture.auditErrors ?? []) {
      const conv = fixture.transcript.topicConversations.find((c) => c.conversationId === audit.source);
      expect(conv).toBeDefined();
      const turn = conv?.turns.find((t) => t.turnId === audit.turnId);
      expect(turn).toBeDefined();
      expect(turn?.candidateResponse.includes(audit.quote)).toBe(true);
    }
  });

  it('split-a carries a report-only correction for every audit error, and a grounded inaudible watch-list (Phase 3 Batch A)', () => {
    const fixture = loadFixture('split-a-strong-comm-poor-grammar');
    expect(fixture.auditErrors?.map((a) => a.correction)).toEqual([
      'je fais',
      'on joue',
      'on regarde',
      "j'aime",
      'je préfère le sport au cinéma',
    ]);
    expect(fixture.inaudibleWatchList).toHaveLength(3);
    for (const watch of fixture.inaudibleWatchList ?? []) {
      const turn = fixture.transcript.topicConversations
        .find((c) => c.conversationId === watch.source)
        ?.turns.find((t) => t.turnId === watch.turnId);
      expect(turn?.candidateResponse.includes(watch.quote)).toBe(true);
    }
  });
});

describe('evaluateExpectation (pass-bar evaluator, fake data)', () => {
  it('passes an ungated fixture regardless of its runs', () => {
    const result = evaluateExpectation('borderline', undefined, [{ communication: 20, qualityOfLanguage: 20 }]);
    expect(result.passed).toBe(true);
  });

  it('passes when every run satisfies a max bound', () => {
    const result = evaluateExpectation(
      'weak',
      { communicationMax: 6, qualityOfLanguageMax: 6 },
      [
        { communication: 5, qualityOfLanguage: 4 },
        { communication: 6, qualityOfLanguage: 6 },
        { communication: 3, qualityOfLanguage: 5 },
      ],
    );
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails when any single run violates a max bound (3 of 3 required)', () => {
    const result = evaluateExpectation(
      'weak',
      { communicationMax: 6, qualityOfLanguageMax: 6 },
      [
        { communication: 5, qualityOfLanguage: 4 },
        { communication: 7, qualityOfLanguage: 6 },
        { communication: 3, qualityOfLanguage: 5 },
      ],
    );
    expect(result.passed).toBe(false);
    expect(result.failures).toEqual(['weak run 2: Communication 7 > required maximum 6']);
  });

  it('fails when any single run violates a min bound', () => {
    const result = evaluateExpectation(
      'strong',
      { communicationMin: 13, qualityOfLanguageMin: 13 },
      [
        { communication: 14, qualityOfLanguage: 13 },
        { communication: 12, qualityOfLanguage: 14 },
      ],
    );
    expect(result.passed).toBe(false);
    expect(result.failures).toEqual(['strong run 2: Communication 12 < required minimum 13']);
  });

  it('reports every violated run, not just the first', () => {
    const result = evaluateExpectation(
      'weak',
      { communicationMax: 6 },
      [{ communication: 8, qualityOfLanguage: 1 }, { communication: 9, qualityOfLanguage: 1 }],
    );
    expect(result.failures).toHaveLength(2);
  });

  it('allExpectationsPassed is true only when every fixture result passed', () => {
    const results = [
      evaluateExpectation('a', undefined, []),
      evaluateExpectation('b', { communicationMax: 6 }, [{ communication: 5, qualityOfLanguage: 1 }]),
    ];
    expect(allExpectationsPassed(results)).toBe(true);

    const withFailure = [
      ...results,
      evaluateExpectation('c', { communicationMax: 6 }, [{ communication: 9, qualityOfLanguage: 1 }]),
    ];
    expect(allExpectationsPassed(withFailure)).toBe(false);
  });
});
