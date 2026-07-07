import { describe, expect, it } from 'vitest';
import { ADVERSARIAL_TIMEFRAME_CASES } from './fixtures';
import {
  classifyResponseTimeFrame,
  deriveExpectedTimeFrameFromCues,
  detectTimeFrameAlignment,
} from '../timeFrame';

describe('classifyResponseTimeFrame base cases', () => {
  it('classifies passe compose as past', () => {
    expect(classifyResponseTimeFrame("J'ai visité Paris.")).toBe('past');
  });

  it('classifies imparfait as past', () => {
    expect(classifyResponseTimeFrame('Je regardais la tele.')).toBe('past');
  });

  it('classifies futur proche as future', () => {
    expect(classifyResponseTimeFrame('Je vais étudier ce soir.')).toBe('future');
  });

  it('classifies conditionnel as conditional', () => {
    expect(classifyResponseTimeFrame('Je voudrais aller au cinema.')).toBe('conditional');
  });

  it('returns no_verb for verbless response', () => {
    const result = detectTimeFrameAlignment('past', 'Euh...');
    expect(result.detectedTimeFrame).toBeNull();
    expect(result.alignment).toBe('no_verb');
  });
});

describe('adversarial confusion table (required-pass)', () => {
  for (const testCase of ADVERSARIAL_TIMEFRAME_CASES) {
    it(`${testCase.name} -> ${testCase.expected}`, () => {
      expect(classifyResponseTimeFrame(testCase.response)).toBe(testCase.expected);
    });
  }

  it('present response to recently-cued question is misaligned', () => {
    const expected = deriveExpectedTimeFrameFromCues(
      "Qu'est-ce que tu fais récemment et la semaine dernière ?",
    );
    expect(expected).toBe('past');
    const result = detectTimeFrameAlignment(expected, "Je joue au foot aujourd'hui.");
    expect(result.detectedTimeFrame).toBe('present');
    expect(result.alignment).toBe('misaligned');
  });
});
