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
});
