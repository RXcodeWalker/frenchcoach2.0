/**
 * Pronunciation Lab — the learner's local history shape (pronunciation-lab plan
 * §3.3, §3.4, §4 `labStore`). Pure: this file validates, appends and trims; the
 * localStorage wrapper is `services/pronunciation/labStore.ts`.
 *
 * Per take it keeps only sound-family evidence (a family, an accuracy and the
 * local day) — no word, sentence, transcript or audio. Per monthly check it
 * keeps "N of M words clear" for each benchmark sentence. Both are ring-buffered
 * so storage never grows without bound.
 */

import type { DatedObservation, FamilyObservation, ScoredFamilyId } from './soundFamilies';
import { SCORED_FAMILIES } from './soundFamilies';
import type { MonthlyCheckResult } from './monthlyCheck';
import { sanitizeCheck } from './monthlyCheck';
import { isDay } from './days';

export interface LabHistory {
  v: 1;
  /** Oldest first, as `familyStatuses` expects. */
  observations: DatedObservation[];
  /** Oldest first. */
  checks: MonthlyCheckResult[];
}

/** Product decisions (storage size), not measurements. Per family, so a busy family never evicts a quiet one. */
export const MAX_OBSERVATIONS_PER_FAMILY = 80;
export const MAX_CHECKS = 36;

export const EMPTY_LAB_HISTORY: LabHistory = { v: 1, observations: [], checks: [] };

const isScored = (family: unknown): family is ScoredFamilyId => (SCORED_FAMILIES as readonly unknown[]).includes(family);

function sanitizeObservation(raw: unknown): DatedObservation | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!isScored(o.family) || !isDay(o.day)) return null;
  if (typeof o.accuracy !== 'number' || !Number.isFinite(o.accuracy)) return null;
  const basis = o.basis === 'word' ? 'word' : 'phoneme';
  return { family: o.family, accuracy: Math.max(0, Math.min(100, Math.round(o.accuracy))), basis, day: o.day };
}

/** Whatever was in storage → a well-formed history (anything unreadable is dropped, never thrown). */
export function sanitizeLabHistory(raw: unknown): LabHistory {
  if (typeof raw !== 'object' || raw === null) return EMPTY_LAB_HISTORY;
  const r = raw as Record<string, unknown>;
  const observations = Array.isArray(r.observations)
    ? r.observations.map(sanitizeObservation).filter((o): o is DatedObservation => o !== null)
    : [];
  const checks = Array.isArray(r.checks)
    ? r.checks.map(sanitizeCheck).filter((c): c is MonthlyCheckResult => c !== null)
    : [];
  return { v: 1, observations: trimObservations(observations), checks: checks.slice(-MAX_CHECKS) };
}

/** Keeps each family's most recent `MAX_OBSERVATIONS_PER_FAMILY`, preserving overall order. */
export function trimObservations(observations: readonly DatedObservation[]): DatedObservation[] {
  const seen = new Map<ScoredFamilyId, number>();
  const keep = new Array<boolean>(observations.length).fill(false);
  for (let i = observations.length - 1; i >= 0; i--) {
    const family = observations[i].family;
    const n = seen.get(family) ?? 0;
    if (n < MAX_OBSERVATIONS_PER_FAMILY) {
      keep[i] = true;
      seen.set(family, n + 1);
    }
  }
  return observations.filter((_, i) => keep[i]);
}

/** One take's family evidence, stamped with the day it was made. A take with none changes nothing. */
export function appendObservations(history: LabHistory, observations: readonly FamilyObservation[], day: string): LabHistory {
  const dated = observations.map((o): DatedObservation => ({ family: o.family, accuracy: Math.round(o.accuracy), basis: o.basis, day }));
  if (dated.length === 0) return history;
  return { ...history, observations: trimObservations([...history.observations, ...dated]) };
}

export function appendCheck(history: LabHistory, check: MonthlyCheckResult): LabHistory {
  return { ...history, checks: [...history.checks, check].slice(-MAX_CHECKS) };
}
