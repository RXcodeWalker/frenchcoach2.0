import { describe, expect, it } from 'vitest';
import { claimMentionsMarkOrBand } from '../../../../domain/examFeedback/shared/markClaimFilter';
import {
  ANALYSE_BUTTON_LABEL,
  PART_NO_AUDIO,
  PART_NOTHING_ANALYSED,
  PART_NOTHING_STOOD_OUT,
  PRONUNCIATION_PRIVACY_NOTE,
  PRONUNCIATION_STATE_MESSAGE,
  RETRY_BUTTON_LABEL,
} from '../messages';

describe('pronunciation state sentences', () => {
  it('has a sentence for every state the client can resolve (consent_required renders the guardian notice instead)', () => {
    expect(Object.keys(PRONUNCIATION_STATE_MESSAGE).sort()).toEqual(
      ['budget_exhausted', 'daily_cap', 'failed', 'no_audio', 'not_enabled', 'running', 'signed_out'],
    );
  });

  it('never reads as a mark, band, grade or score (ADR 0005 / 0009)', () => {
    const everything = [
      ...Object.values(PRONUNCIATION_STATE_MESSAGE),
      PART_NO_AUDIO,
      PART_NOTHING_ANALYSED,
      PART_NOTHING_STOOD_OUT,
      ANALYSE_BUTTON_LABEL,
      RETRY_BUTTON_LABEL,
      PRONUNCIATION_PRIVACY_NOTE,
    ];
    for (const text of everything) expect(claimMentionsMarkOrBand(text), text).toBe(false);
  });

  it('uses the exact budget wording Learn already shows', () => {
    expect(PRONUNCIATION_STATE_MESSAGE.budget_exhausted).toBe('Pronunciation analysis is unavailable until next month.');
  });
});
