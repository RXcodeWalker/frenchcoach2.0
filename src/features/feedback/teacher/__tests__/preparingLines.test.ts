import { describe, it, expect } from 'vitest';
import { claimMentionsMarkOrBand } from '../../../../domain/examFeedback/shared/markClaimFilter';
import { PREPARING_LINES, SLOW_AFTER_MS, preparingLine } from '../preparingLines';

describe('preparingLine', () => {
  it('follows the real stream phase', () => {
    expect(preparingLine('transcribing', 0)).toBe('Listening back to your answer…');
    expect(preparingLine('generating', 3_000)).toBe('Reading what you said…');
  });

  it('says nothing before any phase is reported, and nothing once the feedback has arrived', () => {
    expect(preparingLine(null, 0)).toBeNull();
    expect(preparingLine(undefined, 5_000)).toBeNull();
    expect(preparingLine('complete', 0)).toBeNull();
    expect(preparingLine('complete', SLOW_AFTER_MS * 3)).toBeNull();
  });

  it('admits a slow wait after about 12 seconds, whichever phase it is in', () => {
    expect(preparingLine('generating', SLOW_AFTER_MS - 1)).toBe('Reading what you said…');
    expect(preparingLine('generating', SLOW_AFTER_MS)).toBe('Taking a little longer — still on it.');
    expect(preparingLine('transcribing', SLOW_AFTER_MS + 5_000)).toBe('Taking a little longer — still on it.');
    expect(preparingLine(null, SLOW_AFTER_MS)).toBe('Taking a little longer — still on it.');
  });

  it('has its own, formal wording for the examiner register', () => {
    expect(preparingLine('transcribing', 0, 'examiner')).toBe('Transcribing your answer…');
    expect(preparingLine('generating', 0, 'examiner')).toBe('Reviewing your response…');
    expect(preparingLine('generating', SLOW_AFTER_MS, 'examiner')).toBe('This is taking a little longer. Still working on it.');
  });

  it('never claims a result, a mark or a band', () => {
    for (const register of Object.values(PREPARING_LINES)) {
      for (const line of Object.values(register)) {
        expect(claimMentionsMarkOrBand(line), line).toBe(false);
        expect(line, line).not.toMatch(/\b(done|ready|finished|complete|great|well done|result|found)\b/i);
      }
    }
  });
});
