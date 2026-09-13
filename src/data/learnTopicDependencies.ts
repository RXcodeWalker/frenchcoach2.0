/** Proposed default ordering (Phase 4 plan §4.5) — a one-line change to
 * correct any specific pairing later. Only the 8 advanced topics are gated;
 * all 16 base topics stay unlocked from day one. */
export const LEARN_TOPIC_DEPENDENCIES: Record<string, string[]> = {
  pro: ['jobs'],
  culture: ['holidays'],
  lifestyle: ['clothes'],
  news: ['environment'],
  slang: ['hobbies'],
  survival: ['transport'],
  debate: ['school'],
  art: ['arts'], // advanced "art" vs base "arts" — verified distinct keys, do not conflate
};
