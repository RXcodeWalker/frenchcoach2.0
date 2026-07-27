/**
 * Tier-1 `negation` detector (§10.3): negation completeness. Flags a subject
 * + verb-shaped token immediately followed by "pas"/"plus"/"jamais" with no
 * "ne"/"n'" before the verb — a dropped `ne`. Advisory-only per Part 2: spoken
 * French ne-drop is normal register, not an accuracy error, so this stays
 * `forbidden` (report-only) permanently, not merely at birth.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, findNormalizedOccurrenceSpan, normalize } from '../framework/text';
import type { Observation } from '../framework/observation';

const SUBJECTS = new Set(['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles']);
const NEGATION_PARTICLES = new Set(['pas', 'plus', 'jamais', 'rien', 'personne']);

export const negationDetector: Detector = {
  id: 'negation',
  version: '1',
  tier: 1,
  dependsOn: ['tokenize'],
  produces: ['negation_incomplete'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const normalized = normalize(unit.text);
      if (!normalized) continue;
      const words = normalized.split(' ').filter(Boolean);
      const seenCount = new Map<string, number>();

      for (let i = 0; i < words.length - 2; i += 1) {
        const subject = words[i];
        const verb = words[i + 1];
        const particle = words[i + 2];

        if (!SUBJECTS.has(subject) || !NEGATION_PARTICLES.has(particle)) continue;
        // "ne"/"n'" strips out under normalize() (apostrophes become spaces,
        // and "ne" itself is a real token) — if "ne" appears immediately
        // before the subject, negation is complete.
        if (words[i - 1] === 'ne') continue;

        const value = `${subject} ${verb} ${particle}`;
        const occurrence = seenCount.get(value) ?? 0;
        seenCount.set(value, occurrence + 1);
        const span = findNormalizedOccurrenceSpan(unit, value, occurrence);
        observations.push({
          observationId: computeObservationId('negation', '1', 'negation_incomplete', span, value),
          detectorId: 'negation',
          detectorVersion: '1',
          type: 'negation_incomplete',
          value,
          spans: span,
          confidence: 0.9,
          markInfluence: 'forbidden',
          skillNodeId: null,
        });
      }
    }

    return observations;
  },
};
