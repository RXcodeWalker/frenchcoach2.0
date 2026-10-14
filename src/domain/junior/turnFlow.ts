/**
 * The per-turn state machine of a Junior mission (junior-track §2, §5, §6, §7, §9).
 * Pure: the UI feeds it what happened and gets back what Léo does next.
 *
 * Question turns:
 *  - `got`    → Léo celebrates, one praise word, move on.
 *  - `almost` → Léo says the sentence once, the kid repeats once, move on
 *               (whatever the repeat produced).
 *  - `none`   → Léo looks curious, one more go.
 *  - a second `none` on the same turn → never a third ask: « On le dit
 *    ensemble ! », Léo plays the model sentence, move on. The turn is recorded
 *    honestly as `none`, never upgraded.
 * The recorded outcome is the first answer that wasn't `none`, before any
 * modelling: a repeat after Léo said the sentence never changes it (an `almost`
 * stays `almost` even if the repeat is perfect).
 *
 * Silence (no audio detected — warmup.ts's `isSilent`): the kid is asked again.
 * A silent try is not an attempt: it is not recorded, never counts toward the
 * two-"none" rule, and never reaches the scaffold or the tally. Léo asks again
 * (« Encore ? », then the "Check your mic 🎙" hint). So a broken or blocked mic
 * can never stall a mission, after MAX_SILENT_REPEATS silent tries in a row the
 * next silence is treated as an ordinary `none` (question turns) or completes
 * the turn (« Et toi ? »); any heard try resets the count.
 *
 * Warm-up: always accepted (one `checkMic` retry at most, see warmup.ts).
 * « Et toi ? »: always complete, whatever was heard (§7).
 *
 * Per-turn feedback is Léo's state plus AT MOST one line (§9): `line` is a single
 * key or null, never a list. No score, number or verdict anywhere.
 */
import { PRAISE, TOGETHER, WARMUP_AWAKE } from '../../data/junior';
import type { JuniorEtToi, JuniorLine, JuniorPattern } from '../../data/junior/types';
import type { MatchResult } from './matchAnswer';
import type { LeoState, MatchOutcome, Recogniser, ScaffoldStep } from './types';
import type { WarmupDecision } from './warmup';

/** After this many `none` results on one turn, the mission moves on (§6). */
export const MAX_NONE_PER_TURN = 2;

/** Silent tries in a row that are re-asked before a silence counts as `none`. UNVALIDATED: tune at the playtest. */
export const MAX_SILENT_REPEATS = 3;

/**
 * The one optional line Léo shows/says for a response. Resolved to text by the UI
 * from the bank's fixed lines (praise set, « On le dit ensemble ! », the warm-up
 * line, the « Et toi ? » reply, the pattern's level-up line); `checkMic` is the
 * icon-only "Check your mic 🎙" hint.
 */
export type TurnLine = 'praise' | 'encore' | 'together' | 'warmupAwake' | 'etToiReply' | 'checkMic' | 'levelUp';

export interface TurnResponse {
  leo: LeoState;
  /** At most one line (§9). */
  line: TurnLine | null;
  /** Léo plays the kid's chosen (model) sentence aloud. */
  playModel: boolean;
  next: 'listen' | 'moveOn';
}

export interface QuestionTurnState {
  kind: 'question';
  phase: 'answer' | 'retry' | 'repeat' | 'done';
  /** Every attempt's outcome, in order (the repeat included). */
  attempts: MatchOutcome[];
  /** Set when the turn is done. */
  outcome: MatchOutcome | null;
  /** The match the recorded outcome came from (its per-frame outcomes feed the scaffold). */
  decisive: MatchResult | null;
  /** The turn ended with « On le dit ensemble ! ». */
  together: boolean;
  /** Silent tries in a row since the last heard one (never recorded as attempts). */
  silences: number;
}

export interface WarmupTurnState {
  kind: 'warmup';
  phase: 'answer' | 'retry' | 'done';
  outcome: 'complete' | null;
  /** The recogniser for the rest of the mission, once the warm-up is done. */
  recogniser: Recogniser | null;
}

export interface EtToiTurnState {
  kind: 'etToi';
  phase: 'answer' | 'done';
  outcome: 'complete' | null;
  /** Silent tries in a row. */
  silences: number;
}

export interface Step<S> {
  state: S;
  response: TurnResponse;
}

/** Echo step: after the kid picks, Léo says THEIR chosen sentence before the mic opens (§5). */
export function modelsBeforeListening(step: ScaffoldStep): boolean {
  return step === 'echo';
}

const moveOn = (leo: LeoState, line: TurnLine | null, playModel = false): TurnResponse => ({ leo, line, playModel, next: 'moveOn' });
const listen = (leo: LeoState, line: TurnLine | null, playModel = false): TurnResponse => ({ leo, line, playModel, next: 'listen' });

// ── Question turns ───────────────────────────────────────────────────────────

export function startQuestionTurn(): QuestionTurnState {
  return { kind: 'question', phase: 'answer', attempts: [], outcome: null, decisive: null, together: false, silences: 0 };
}

const SILENT: MatchResult = { outcome: 'none', frames: [], heard: [] };

/** The re-ask after a silent try: « Encore ? » the first time, then the mic hint. */
const askAgain = (silences: number): TurnResponse => listen('listening', silences <= 1 ? 'encore' : 'checkMic');

/**
 * The kid said nothing (no audio detected): ask again without recording an
 * attempt, up to MAX_SILENT_REPEATS times in a row; after that a silence is an
 * ordinary `none`, so the two-"none" rule still guarantees the mission moves on.
 */
export function silentQuestion(state: QuestionTurnState): Step<QuestionTurnState> {
  if (state.phase === 'done') return { state, response: moveOn('happy', null) };
  if (state.silences < MAX_SILENT_REPEATS) {
    const silences = state.silences + 1;
    return { state: { ...state, silences }, response: askAgain(silences) };
  }
  return answerQuestion(state, SILENT);
}

export function answerQuestion(state: QuestionTurnState, match: MatchResult): Step<QuestionTurnState> {
  if (state.phase === 'done') return { state, response: moveOn('happy', null) };
  const attempts = [...state.attempts, match.outcome];
  state = { ...state, silences: 0 };
  const done = (outcome: MatchOutcome, decisive: MatchResult | null, together = false): QuestionTurnState => ({
    ...state,
    phase: 'done',
    attempts,
    outcome,
    decisive,
    together,
  });

  if (state.phase === 'repeat') {
    // The repeat after modelling never changes the recorded `almost`.
    const leo: LeoState = match.outcome === 'got' ? 'celebrating' : 'happy';
    return { state: done('almost', state.decisive), response: moveOn(leo, match.outcome === 'got' ? 'praise' : null) };
  }

  switch (match.outcome) {
    case 'got':
      return { state: done('got', match), response: moveOn('celebrating', 'praise') };
    case 'almost':
      return {
        state: { ...state, phase: 'repeat', attempts, decisive: match },
        response: listen('happy', null, true),
      };
    case 'none': {
      const nones = attempts.filter((a) => a === 'none').length;
      if (nones >= MAX_NONE_PER_TURN) {
        return { state: done('none', match, true), response: moveOn('happy', 'together', true) };
      }
      return { state: { ...state, phase: 'retry', attempts }, response: listen('curious', 'encore') };
    }
  }
}

// ── Warm-up ──────────────────────────────────────────────────────────────────

export function startWarmupTurn(): WarmupTurnState {
  return { kind: 'warmup', phase: 'answer', outcome: null, recogniser: null };
}

/** Always accepted; a `checkMic` decision earns one more try, never two. */
export function answerWarmup(state: WarmupTurnState, decision: WarmupDecision): Step<WarmupTurnState> {
  if (state.phase === 'done') return { state, response: moveOn('happy', null) };
  if (decision === 'checkMic' && state.phase === 'answer') {
    return { state: { ...state, phase: 'retry' }, response: listen('thinking', 'checkMic') };
  }
  const recogniser: Recogniser = decision === 'checkMic' ? 'webSpeech' : decision;
  return { state: { ...state, phase: 'done', outcome: 'complete', recogniser }, response: moveOn('happy', 'warmupAwake') };
}

// ── « Et toi ? » ─────────────────────────────────────────────────────────────

export function startEtToiTurn(): EtToiTurnState {
  return { kind: 'etToi', phase: 'answer', outcome: null, silences: 0 };
}

/** The kid said nothing: ask again, up to MAX_SILENT_REPEATS times; after that the turn completes anyway. */
export function silentEtToi(state: EtToiTurnState): Step<EtToiTurnState> {
  if (state.phase === 'done') return { state, response: moveOn('happy', null) };
  if (state.silences < MAX_SILENT_REPEATS) {
    const silences = state.silences + 1;
    return { state: { ...state, silences }, response: askAgain(silences) };
  }
  return answerEtToi(state);
}

/** Whatever was heard — even nothing — the turn is complete and Léo gives his funny reply (§7). */
export function answerEtToi(state: EtToiTurnState): Step<EtToiTurnState> {
  return { state: { ...state, phase: 'done', outcome: 'complete', silences: 0 }, response: moveOn('happy', 'etToiReply') };
}

// ── Level-up ─────────────────────────────────────────────────────────────────

/**
 * A move up the scaffold ladder is announced with the pattern's level-up line
 * (§5). It REPLACES the response's line, so a turn still shows at most one (§9).
 * A move down has no event and changes nothing.
 */
export function withLevelUp(response: TurnResponse, levelledUp: boolean): TurnResponse {
  return levelledUp ? { ...response, leo: 'celebrating', line: 'levelUp' } : response;
}

// ── Resolving the one line ───────────────────────────────────────────────────

/** What a response's line resolves to: one of Léo's fixed French lines, or the icon-only mic hint. */
export type TurnLineText = { kind: 'leo'; line: JuniorLine } | { kind: 'hint'; icon: '🎙'; en: 'Check your mic' };

export interface TurnLineContext {
  /** Index of the turn in the mission; rotates the praise word. */
  turnIndex: number;
  /** Needed for `etToiReply`. */
  etToi?: JuniorEtToi;
  /** Needed for `levelUp`: the pattern the kid moved up on. */
  pattern?: JuniorPattern;
}

const CELEBRATION = PRAISE.filter((p) => p.audioId !== 'praise.encore');
const ENCORE = PRAISE.find((p) => p.audioId === 'praise.encore');

/**
 * The text (and audio id) of a response's one line. Praise only ever comes from
 * the fixed set (§8): « Super ! », « Bravo ! », « Génial ! » rotate on « got it »,
 * « Encore ? » invites the second go after « none ».
 */
export function turnLineText(line: TurnLine, ctx: TurnLineContext): TurnLineText {
  const leo = (l: JuniorLine | undefined, what: string): TurnLineText => {
    if (!l) throw new Error(`Junior turn line '${line}' needs ${what}`);
    return { kind: 'leo', line: l };
  };
  switch (line) {
    case 'praise':
      return leo(CELEBRATION[Math.abs(ctx.turnIndex) % CELEBRATION.length], 'the praise set');
    case 'encore':
      return leo(ENCORE, '« Encore ? » in the praise set');
    case 'together':
      return leo(TOGETHER, 'TOGETHER');
    case 'warmupAwake':
      return leo(WARMUP_AWAKE, 'WARMUP_AWAKE');
    case 'etToiReply':
      return leo(ctx.etToi?.reply, 'the « Et toi ? » turn');
    case 'levelUp':
      return leo(ctx.pattern?.levelUp, 'the pattern');
    case 'checkMic':
      return { kind: 'hint', icon: '🎙', en: 'Check your mic' };
  }
}
