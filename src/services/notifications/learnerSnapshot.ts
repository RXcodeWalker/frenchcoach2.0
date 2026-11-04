// ── Retention loop: the learner snapshot (docs/systems/retention-notifications.md §1) ──
// What the notification sender needs to say something SPECIFIC — the streak
// count the app shows, its day key, streak freezes, the learner's timezone,
// and the recurring mistake the coach is tracking — mirrored push-only to
// Supabase `learner_snapshots`. Never read back: local state stays
// authoritative (the profileSettingsSync.ts precedent).
//
// buildLearnerSnapshot is pure; pushLearnerSnapshot gathers the inputs from
// local services and upserts, best-effort (never throws).

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { getStreakState } from '../analytics/analyticsService';
import { hasStreakFreeze } from '../progression/progressionService';
import { getActiveProblem } from '../coach/interventionService';
import { getEvidenceEvents } from '../coach/coachStorage';
import { hasMicroDrillForSkill } from '../coach/recurringGrammar';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';
import type { LearningProblem } from '../../types/intervention';
import type { EvidenceEvent } from '../../types/evidence';

const WEEK_MS = 7 * 86_400_000;

export interface LearnerSnapshotRow {
  user_id: string;
  timezone: string;
  streak_count: number;
  streak_last_date: string | null;
  streak_freezes: number;
  focus_skill_id: string | null;
  focus_label: string | null;
  focus_hint: string | null;
  focus_misses: number | null;
  focus_last_missed_at: string | null;
  focus_has_drill: boolean;
  updated_at: string;
}

export interface SnapshotInputs {
  userId: string;
  timezone: string;
  streak: { count: number; lastDate: string | null };
  hasFreeze: boolean;
  problem: LearningProblem | null;
  evidence: EvidenceEvent[];
  skillDefs: Record<string, { name: string; desc: string }>;
  hasDrill: (skillId: string) => boolean;
  now: number;
}

const SKILL_ID = /^[a-z_]{1,40}$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Only an `active` problem is a focus ("monitoring" means a drill already went
 * well — don't nag). Misses are the problem's evidence from the last 7 days,
 * so "came back 3 times this week" is literally true.
 */
export function buildLearnerSnapshot(i: SnapshotInputs): LearnerSnapshotRow {
  let focus: Pick<LearnerSnapshotRow, 'focus_skill_id' | 'focus_label' | 'focus_hint' | 'focus_misses' | 'focus_last_missed_at' | 'focus_has_drill'> = {
    focus_skill_id: null, focus_label: null, focus_hint: null, focus_misses: null, focus_last_missed_at: null, focus_has_drill: false,
  };
  const p = i.problem;
  const def = p ? i.skillDefs[p.nodeId] : undefined;
  if (p && p.status === 'active' && def && SKILL_ID.test(p.nodeId)) {
    const ids = new Set(p.evidenceIds);
    const recent = i.evidence
      .filter(ev => ids.has(ev.id))
      .map(ev => Date.parse(ev.occurredAt))
      .filter(t => Number.isFinite(t) && i.now - t <= WEEK_MS);
    if (recent.length > 0) {
      focus = {
        focus_skill_id: p.nodeId,
        focus_label: def.name.slice(0, 60),
        focus_hint: def.desc ? def.desc.slice(0, 80) : null,
        focus_misses: recent.length,
        focus_last_missed_at: new Date(Math.max(...recent)).toISOString(),
        focus_has_drill: i.hasDrill(p.nodeId),
      };
    }
  }
  return {
    user_id: i.userId,
    timezone: i.timezone,
    streak_count: Math.max(0, Math.min(10_000, Math.floor(i.streak.count || 0))),
    streak_last_date: i.streak.lastDate && DATE_KEY.test(i.streak.lastDate) ? i.streak.lastDate : null,
    streak_freezes: i.hasFreeze ? 1 : 0,
    ...focus,
    updated_at: new Date(i.now).toISOString(),
  };
}

function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

let lastPushed: string | null = null;

/** Upserts the signed-in learner's snapshot; skips when nothing changed since the last push this page load. */
export async function pushLearnerSnapshot(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const timezone = deviceTimezone();
  if (!timezone) return;
  try {
    const row = buildLearnerSnapshot({
      userId,
      timezone,
      streak: getStreakState(),
      hasFreeze: hasStreakFreeze(),
      problem: getActiveProblem(),
      evidence: getEvidenceEvents(),
      skillDefs: SKILL_DEFS,
      hasDrill: hasMicroDrillForSkill,
      now: Date.now(),
    });
    const key = JSON.stringify({ ...row, updated_at: null });
    if (key === lastPushed) return;
    const { error } = await supabase.from('learner_snapshots').upsert(row, { onConflict: 'user_id' });
    if (error) {
      console.warn('[learnerSnapshot] push failed:', error.message);
      return;
    }
    lastPushed = key;
  } catch (err) {
    console.warn('[learnerSnapshot] push error:', err);
  }
}

/** Test hook. */
export function resetLearnerSnapshotCache(): void {
  lastPushed = null;
}
