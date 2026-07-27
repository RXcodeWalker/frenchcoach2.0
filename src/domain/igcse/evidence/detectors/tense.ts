/**
 * Tier-1 `tense` detector (§10.3): tense counts, citing verb+span. Consumes
 * `tag-verbs` (Tier 0). Emits `tense_detected` for each tagged verb and
 * `tense_missing` once per response unit with zero tagged verbs (a no-verb
 * answer — never penalised, purely observational per §Part 2 "no_verb").
 * skillNodeId is resolved via nodeMap (tense_past / tense_future) at the
 * observation-consumption layer, not here — see framework/nodeMap.ts §10.3
 * table; this detector stays board-neutral and leaves skillNodeId null,
 * matching every other Phase-3 detector (nodeMap resolution happens in
 * features/project.ts and the coach projection seam, per §10.4/§10.5).
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, findNormalizedOccurrenceSpan, normalize } from '../framework/text';
import type { Observation } from '../framework/observation';
import { tagVerbTokens, tagToTimeFrame } from './tagVerbs';

export const tenseDetector: Detector = {
  id: 'tense',
  version: '1',
  tier: 1,
  dependsOn: ['tag-verbs'],
  produces: ['tense_detected', 'tense_missing'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const normalized = normalize(unit.text);
      const words = normalized ? normalized.split(' ').filter(Boolean) : [];
      const tagged = tagVerbTokens(words).filter(({ verb }) => verb.tag !== 'auxiliary');

      if (tagged.length === 0) {
        const span = [{ startOffset: unit.startOffset, endOffset: unit.startOffset + unit.text.length }];
        observations.push({
          observationId: computeObservationId('tense', '1', 'tense_missing', span, unit.unitId),
          detectorId: 'tense',
          detectorVersion: '1',
          type: 'tense_missing',
          value: unit.unitId,
          spans: span,
          confidence: 0.7,
          markInfluence: 'forbidden',
          skillNodeId: null,
        });
        continue;
      }

      // Occurrence index disambiguates a verb-shaped word repeated across
      // the unit (§9.2 set-not-bag), counted per surface word.
      const seenCount = new Map<string, number>();

      for (const { verb } of tagged) {
        const occurrence = seenCount.get(verb.word) ?? 0;
        seenCount.set(verb.word, occurrence + 1);
        const timeFrame = tagToTimeFrame(verb.tag);
        const span = findNormalizedOccurrenceSpan(unit, verb.word, occurrence);
        const value = `${timeFrame}:${verb.tag}:${verb.word}`;
        observations.push({
          observationId: computeObservationId('tense', '1', 'tense_detected', span, value),
          detectorId: 'tense',
          detectorVersion: '1',
          type: 'tense_detected',
          value,
          spans: span,
          confidence: 0.7,
          markInfluence: 'forbidden',
          skillNodeId: null,
        });
      }
    }

    return observations;
  },
};
