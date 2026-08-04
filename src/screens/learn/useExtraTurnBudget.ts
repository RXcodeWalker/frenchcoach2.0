import { useState, useCallback } from 'react';
import { PRACTICE_MAX_PER_SESSION } from '../../domain/pronunciation/practiceThresholds';
import { FOLLOWUP_MAX_PER_SESSION } from '../../domain/followUp/followUpThresholds';

/**
 * Owns the per-session "extra turn" budget (Say It Again practice steps +
 * follow-up turns) so Learn.tsx can reset it on session boundaries without
 * missing a piece — before this was extracted, practiceStepsUsed/
 * followUpsUsed were plain useState(0) that never got reset between
 * sessions in one mounted Learn instance, silently disabling both features
 * after the first session of a visit.
 */
export function useExtraTurnBudget() {
  const [practiceStepsUsed, setPracticeStepsUsed] = useState(0);
  const [followUpsUsed, setFollowUpsUsed] = useState(0);
  const [extraTurnOfferedForIndex, setExtraTurnOfferedForIndex] = useState<number | null>(null);

  const canOfferPractice = useCallback(
    (index: number | null) => practiceStepsUsed < PRACTICE_MAX_PER_SESSION && extraTurnOfferedForIndex !== index,
    [practiceStepsUsed, extraTurnOfferedForIndex],
  );

  const canOfferFollowUp = useCallback(
    (index: number | null) => followUpsUsed < FOLLOWUP_MAX_PER_SESSION && extraTurnOfferedForIndex !== index,
    [followUpsUsed, extraTurnOfferedForIndex],
  );

  const consumePractice = useCallback((index: number | null) => {
    setPracticeStepsUsed(n => n + 1);
    setExtraTurnOfferedForIndex(index);
  }, []);

  const consumeFollowUp = useCallback((index: number | null) => {
    setFollowUpsUsed(n => n + 1);
    setExtraTurnOfferedForIndex(index);
  }, []);

  const resetForNewQuestion = useCallback(() => {
    setExtraTurnOfferedForIndex(null);
  }, []);

  const resetForNewSession = useCallback(() => {
    setPracticeStepsUsed(0);
    setFollowUpsUsed(0);
    setExtraTurnOfferedForIndex(null);
  }, []);

  return {
    practiceStepsUsed,
    followUpsUsed,
    canOfferPractice,
    canOfferFollowUp,
    consumePractice,
    consumeFollowUp,
    resetForNewQuestion,
    resetForNewSession,
  };
}
