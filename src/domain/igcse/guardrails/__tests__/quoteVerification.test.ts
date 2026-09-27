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

  it("P0 step 4: fires when a role-play task cites another task's words", () => {
    const [first, second] = CLEAN_LONG_TRANSCRIPT.rolePlay;
    const crossTask = {
      ...CLEAN_ASSESSMENT,
      rolePlay: {
        ...CLEAN_ASSESSMENT.rolePlay,
        tasks: CLEAN_ASSESSMENT.rolePlay.tasks.map((task) =>
          task.taskId === first.taskId
            ? { ...task, evidenceSpans: [{ source: 'rolePlay' as const, quote: second.candidateResponse }] }
            : task,
        ),
      },
    };
    const triggers = verifyQuotes(crossTask, CLEAN_LONG_TRANSCRIPT);
    expect(triggers).toHaveLength(1);
    expect(triggers[0]).toMatchObject({
      id: 'quote_verification_failed',
      criterion: `rolePlay task ${first.taskId}`,
    });
  });

  it('scoring-prompt-v0.6: fires when a QoL error quote is attributed to the wrong turn', () => {
    // A real topic1 q2 phrase, cited against topic1 q1.
    const misattributed = {
      ...CLEAN_ASSESSMENT,
      qualityOfLanguage: {
        ...CLEAN_ASSESSMENT.qualityOfLanguage,
        errors: [
          { source: 'topic1' as const, turnId: 'q1', quote: 'Je préfère le sport', kind: 'grammar' as const, correction: 'x' },
        ],
      },
    };
    const triggers = verifyQuotes(misattributed, CLEAN_LONG_TRANSCRIPT);
    expect(triggers).toHaveLength(1);
    expect(triggers[0]).toMatchObject({
      id: 'quote_verification_failed',
      criterion: 'qualityOfLanguage',
      source: 'topic1',
      quote: 'Je préfère le sport',
    });
  });

  it('scoring-prompt-v0.6: stays silent on grounded QoL error quotes', () => {
    expect(CLEAN_ASSESSMENT.qualityOfLanguage.errors.length).toBeGreaterThan(0);
    expect(verifyQuotes(CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT)).toEqual([]);
  });
});
