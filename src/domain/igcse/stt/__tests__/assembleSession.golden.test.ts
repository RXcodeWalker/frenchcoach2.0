import { describe, it, expect } from 'vitest';
import { assembleSession } from '../assemble/assembleSession';
import { parseSessionTranscript } from '../schema';
import { CLEAN_RAW_ASR_RESULT, CLEAN_QUESTION_SET, CLEAN_ASSEMBLE_META } from './fixtures';
import cleanGolden from './fixtures/clean-session.golden.json';

describe('assembleSession golden test', () => {
  it('matches the checked-in expected SessionTranscript exactly', () => {
    const result = assembleSession(CLEAN_RAW_ASR_RESULT, CLEAN_QUESTION_SET, CLEAN_ASSEMBLE_META);
    expect(result).toEqual(cleanGolden);
  });

  it('the golden fixture itself parses under the current schema', () => {
    expect(() => parseSessionTranscript(cleanGolden)).not.toThrow();
  });
});
