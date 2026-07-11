import { describe, expect, it } from 'vitest';
import { verifyQuotes } from '../quoteVerification';
import { CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT, FABRICATED_QUOTE_ASSESSMENT } from './synthetic';

describe('verifyQuotes', () => {
  it('fires on an assessment with a fabricated (ungrounded) quote', () => {
    const triggers = verifyQuotes(FABRICATED_QUOTE_ASSESSMENT, CLEAN_LONG_TRANSCRIPT);

    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(triggers[0]).toMatchObject({
      id: 'quote_verification_failed',
      criterion: 'communication',
      source: 'topic1',
    });
  });

  it('stays silent on a clean assessment where every quote is grounded', () => {
    const triggers = verifyQuotes(CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT);
    expect(triggers).toEqual([]);
  });
});
