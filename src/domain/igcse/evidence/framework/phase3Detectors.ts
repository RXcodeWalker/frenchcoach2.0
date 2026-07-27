/**
 * Phase 3 (§10.3, §10.7 "Phase 3 — detector fleet"): the full registered
 * detector list, tier-0 through tier-2, per the exhaustive §10.3 table. Each
 * new detector defaults to `forbidden` mark-influence at birth. Combined with
 * `LEGACY_DETECTORS` (unchanged influence, §10.3 footnote) to form the
 * complete registry in `buildEvidence.ts`.
 */

import type { Detector } from './detector';
import { segmentDetector } from '../detectors/segment';
import { tokenizeDetector } from '../detectors/tokenize';
import { tagVerbsDetector } from '../detectors/tagVerbs';
import { tenseDetector } from '../detectors/tense';
import { agreementDetector } from '../detectors/agreement';
import { articlesDetector } from '../detectors/articles';
import { negationDetector } from '../detectors/negation';
import { auxDetector } from '../detectors/auxiliary';
import { prepositionsDetector } from '../detectors/prepositions';
import { anglicismsDetector } from '../detectors/anglicisms';
import { complexityDetector } from '../detectors/complexity';
import { connectorsDetector } from '../detectors/connectors';
import { lexicalRangeDetector } from '../detectors/lexicalRange';
import { repetitionDetector } from '../detectors/repetition';
import { selfCorrectionDetector } from '../detectors/selfCorrection';
import { coverageDetector } from '../detectors/coverage';
import { constructionsDetector } from '../detectors/constructions';
import { avoidanceDetector } from '../detectors/avoidance';
import { tenseConsistencyDetector } from '../detectors/tenseConsistency';
import { cefrVectorDetector } from '../detectors/cefrVector';

export const PHASE3_DETECTORS: Detector[] = [
  // Tier 0
  segmentDetector,
  tokenizeDetector,
  tagVerbsDetector,
  // Tier 1
  tenseDetector,
  agreementDetector,
  articlesDetector,
  negationDetector,
  auxDetector,
  prepositionsDetector,
  anglicismsDetector,
  complexityDetector,
  connectorsDetector,
  lexicalRangeDetector,
  repetitionDetector,
  selfCorrectionDetector,
  coverageDetector,
  constructionsDetector,
  // Tier 2
  avoidanceDetector,
  tenseConsistencyDetector,
  cefrVectorDetector,
];
