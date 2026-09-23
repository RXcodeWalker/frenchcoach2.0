/**
 * The in-repo offline fixture registry, keyed by questionSetId — shared by
 * the browser loader (../loader.ts) and the Node scoring service
 * (server/resolveQuestionSet.ts), so both resolve the same 10 sets. Must stay
 * Node-safe: no import.meta.env, no browser globals (loader.ts reads
 * import.meta.env and so cannot be imported by the server).
 *
 * W5: all 10 published sets are bundled (not just 001) so a catalog-fetch
 * failure/cold-start degrades to the real 10-exam picker instead of
 * collapsing it to a single offline exam — see ExamSelect.tsx. Content is
 * generated 1:1 from french-coach-backend's data/igcse/original-practice-*.json
 * (the canonical authored source, validated there by `npm run
 * authoring:check`); see each fixture file's own header. Drift from that
 * source is caught by `npx tsx scripts/authoring/checkFixtureParity.ts`.
 */

import { ORIGINAL_PRACTICE_001 } from './original-practice-001';
import { ORIGINAL_PRACTICE_002 } from './original-practice-002';
import { ORIGINAL_PRACTICE_003 } from './original-practice-003';
import { ORIGINAL_PRACTICE_004 } from './original-practice-004';
import { ORIGINAL_PRACTICE_005 } from './original-practice-005';
import { ORIGINAL_PRACTICE_006 } from './original-practice-006';
import { ORIGINAL_PRACTICE_007 } from './original-practice-007';
import { ORIGINAL_PRACTICE_008 } from './original-practice-008';
import { ORIGINAL_PRACTICE_009 } from './original-practice-009';
import { ORIGINAL_PRACTICE_010 } from './original-practice-010';
import type { AuthoredQuestionSet } from '../types';

export const OFFLINE_FIXTURES: Readonly<Record<string, AuthoredQuestionSet>> = {
  [ORIGINAL_PRACTICE_001.questionSetId]: ORIGINAL_PRACTICE_001,
  [ORIGINAL_PRACTICE_002.questionSetId]: ORIGINAL_PRACTICE_002,
  [ORIGINAL_PRACTICE_003.questionSetId]: ORIGINAL_PRACTICE_003,
  [ORIGINAL_PRACTICE_004.questionSetId]: ORIGINAL_PRACTICE_004,
  [ORIGINAL_PRACTICE_005.questionSetId]: ORIGINAL_PRACTICE_005,
  [ORIGINAL_PRACTICE_006.questionSetId]: ORIGINAL_PRACTICE_006,
  [ORIGINAL_PRACTICE_007.questionSetId]: ORIGINAL_PRACTICE_007,
  [ORIGINAL_PRACTICE_008.questionSetId]: ORIGINAL_PRACTICE_008,
  [ORIGINAL_PRACTICE_009.questionSetId]: ORIGINAL_PRACTICE_009,
  [ORIGINAL_PRACTICE_010.questionSetId]: ORIGINAL_PRACTICE_010,
};
