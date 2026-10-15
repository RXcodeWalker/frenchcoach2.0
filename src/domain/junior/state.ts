// Junior track — persisted learner state (Batch 3A; spec docs/systems/junior-track.md).
// Pure and storage-free: the AppContext reducer owns the writes. Nothing here
// touches Sessions, XP, topic mastery, Learn evidence or IGCSE data, and the
// reward path (`awardSticker`) takes no outcome, so accuracy cannot reach it.

export type LearnerTrack = 'exam' | 'junior';
export type JuniorStep = 'echo' | 'frame' | 'free';
export type JuniorOutcome = 'got' | 'almost' | 'none';

/** A mission left unfinished can be resumed for this long, then it is silently gone. */
export const MISSION_RESUME_MS = 24 * 60 * 60 * 1000;

export interface JuniorTurnResult {
  turnId: string;
  outcome: JuniorOutcome;
}

/** What `recordTurn` accepts: the stored result plus the tries that heard nothing (playtest read-out only, never stored on the mission). */
export interface JuniorTurnRecord extends JuniorTurnResult {
  silentTries?: number;
}

export interface ActiveMission {
  themeId: string;
  /** Epoch ms the mission started; the 24 h resume window is measured from here. */
  startedAt: number;
  results: JuniorTurnResult[];
}

export interface JuniorState {
  /** Scaffold ladder step per sentence pattern id. A missing pattern starts at `echo`. */
  patternSteps: Record<string, JuniorStep>;
  /** Sticker ids earned, per theme, in the order earned. */
  stickers: Record<string, string[]>;
  /** Unlock ids (outfits/backgrounds) earned. */
  unlocks: string[];
  /** Finished missions per theme. */
  missionsDone: Record<string, number>;
  demoSeen: boolean;
  activeMission: ActiveMission | null;
  /** Local got/almost/none counts for the playtest read-out. Never sent anywhere. */
  outcomeTally: Record<JuniorOutcome, number>;
  /** Question-turn tries that heard no audio, kept apart from `none` (junior-track §6, Playtest gate). */
  silentTries: number;
}

export const DEFAULT_LEARNER_TRACK: LearnerTrack = 'exam';

export function emptyJuniorState(): JuniorState {
  return {
    patternSteps: {},
    stickers: {},
    unlocks: [],
    missionsDone: {},
    demoSeen: false,
    activeMission: null,
    outcomeTally: { got: 0, almost: 0, none: 0 },
    silentTries: 0,
  };
}

const STEPS: readonly JuniorStep[] = ['echo', 'frame', 'free'];
const OUTCOMES: readonly JuniorOutcome[] = ['got', 'almost', 'none'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

export function parseLearnerTrack(raw: unknown): LearnerTrack {
  return raw === 'junior' ? 'junior' : DEFAULT_LEARNER_TRACK;
}

export function isMissionResumable(mission: ActiveMission | null, now: number): mission is ActiveMission {
  return mission !== null && now - mission.startedAt >= 0 && now - mission.startedAt < MISSION_RESUME_MS;
}

function parseMission(raw: unknown, now: number): ActiveMission | null {
  if (!isRecord(raw) || !isStr(raw.themeId) || typeof raw.startedAt !== 'number' || !Number.isFinite(raw.startedAt)) return null;
  const results = Array.isArray(raw.results)
    ? raw.results.flatMap((r): JuniorTurnResult[] =>
        isRecord(r) && isStr(r.turnId) && OUTCOMES.includes(r.outcome as JuniorOutcome)
          ? [{ turnId: r.turnId, outcome: r.outcome as JuniorOutcome }]
          : [])
    : [];
  const mission: ActiveMission = { themeId: raw.themeId, startedAt: raw.startedAt, results };
  // An expired mission is dropped silently — no message, no sticker.
  return isMissionResumable(mission, now) ? mission : null;
}

/** Defensive read of the stored blob: anything malformed falls back to the empty value. */
export function parseJuniorState(raw: unknown, now: number): JuniorState {
  const base = emptyJuniorState();
  if (!isRecord(raw)) return base;

  const patternSteps: Record<string, JuniorStep> = {};
  if (isRecord(raw.patternSteps)) {
    for (const [k, v] of Object.entries(raw.patternSteps)) if (STEPS.includes(v as JuniorStep)) patternSteps[k] = v as JuniorStep;
  }
  const stickers: Record<string, string[]> = {};
  if (isRecord(raw.stickers)) {
    for (const [k, v] of Object.entries(raw.stickers)) if (Array.isArray(v)) stickers[k] = [...new Set(v.filter(isStr))];
  }
  const missionsDone: Record<string, number> = {};
  if (isRecord(raw.missionsDone)) {
    for (const [k, v] of Object.entries(raw.missionsDone)) missionsDone[k] = count(v);
  }
  const tally = isRecord(raw.outcomeTally) ? raw.outcomeTally : {};

  return {
    patternSteps,
    stickers,
    unlocks: Array.isArray(raw.unlocks) ? [...new Set(raw.unlocks.filter(isStr))] : [],
    missionsDone,
    demoSeen: raw.demoSeen === true,
    activeMission: parseMission(raw.activeMission, now),
    outcomeTally: { got: count(tally.got), almost: count(tally.almost), none: count(tally.none) },
    silentTries: count(raw.silentTries),
  };
}

/**
 * Starting a mission on a theme that already has a resumable one keeps it
 * (that is the resume); any other start replaces whatever was there.
 */
export function startMission(state: JuniorState, themeId: string, now: number): JuniorState {
  const current = state.activeMission;
  if (isMissionResumable(current, now) && current.themeId === themeId) return state;
  return { ...state, activeMission: { themeId, startedAt: now, results: [] } };
}

export interface PatternStep {
  patternId: string;
  step: JuniorStep;
}

/**
 * Records one question turn (honestly: a "none" stays "none") and the scaffold
 * step(s) the caller computed for that turn's pattern(s) — a two-frame turn can
 * move two patterns at once. No active mission → no-op.
 */
export function recordTurn(
  state: JuniorState,
  turn: JuniorTurnRecord,
  patternStep?: PatternStep | readonly PatternStep[],
): JuniorState {
  const mission = state.activeMission;
  if (!mission) return state;
  // A turn is recorded once; a repeat of the same turn id is ignored.
  if (mission.results.some((r) => r.turnId === turn.turnId)) return state;
  const steps: readonly PatternStep[] = patternStep === undefined ? [] : Array.isArray(patternStep) ? patternStep : [patternStep as PatternStep];
  const patternSteps = { ...state.patternSteps };
  for (const s of steps) patternSteps[s.patternId] = s.step;
  return {
    ...state,
    activeMission: { ...mission, results: [...mission.results, { turnId: turn.turnId, outcome: turn.outcome }] },
    patternSteps,
    outcomeTally: { ...state.outcomeTally, [turn.outcome]: state.outcomeTally[turn.outcome] + 1 },
    silentTries: state.silentTries + count(turn.silentTries),
  };
}

/**
 * Completes the active mission for `themeId`. The sticker and unlock come from
 * the caller (rewards.ts, whose input never includes outcomes); finishing is
 * what earns them, so an all-"none" mission earns exactly what an all-"got" one does.
 * No matching active mission → no-op, so a double dispatch cannot award twice.
 */
export function finishMission(
  state: JuniorState,
  award: { themeId: string; stickerId: string; unlockId?: string },
): JuniorState {
  if (!state.activeMission || state.activeMission.themeId !== award.themeId) return state;
  const owned = state.stickers[award.themeId] ?? [];
  return {
    ...state,
    stickers: owned.includes(award.stickerId) ? state.stickers : { ...state.stickers, [award.themeId]: [...owned, award.stickerId] },
    unlocks: award.unlockId && !state.unlocks.includes(award.unlockId) ? [...state.unlocks, award.unlockId] : state.unlocks,
    missionsDone: { ...state.missionsDone, [award.themeId]: (state.missionsDone[award.themeId] ?? 0) + 1 },
    activeMission: null,
  };
}

export function markDemoSeen(state: JuniorState): JuniorState {
  return state.demoSeen ? state : { ...state, demoSeen: true };
}
