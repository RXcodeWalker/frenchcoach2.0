/**
 * Builds one mission for a theme (junior-track §1): [the first-run demo, once
 * ever] + the warm-up + 4–5 question turns + « Et toi ? ».
 *
 * The mission holds ids, not copies of the content, so it can be stored for the
 * 24 h resume (Batch 3) and resolved against the bank. It does not snapshot
 * scaffold steps: the caller reads each frame's step (`scaffold.stepFor`) when the
 * turn starts, so a level-up earlier in the mission applies to later turns with
 * the same pattern.
 *
 * Pure: randomness is injected (`random`, default Math.random) so tests are
 * deterministic.
 */
import type { JuniorBank } from '../../data/junior/types';

/** Question turns per mission: 5 when the theme has them, never fewer than 4 (§1). */
export const QUESTION_TURNS = 5;
export const MIN_QUESTION_TURNS = 4;

export type MissionTurn =
  | { kind: 'demo' }
  | { kind: 'warmup' }
  | { kind: 'question'; questionId: string }
  | { kind: 'etToi'; etToiId: string };

export interface Mission {
  themeId: string;
  turns: MissionTurn[];
}

export interface MissionProgress {
  /** The first-run demo has been shown on this account (`junior.demoSeen`). */
  demoSeen: boolean;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildMission(
  bank: Pick<JuniorBank, 'themes' | 'questions'>,
  themeId: string,
  progress: MissionProgress,
  random: () => number = Math.random,
): Mission {
  const theme = bank.themes.find((t) => t.id === themeId);
  if (!theme) throw new Error(`Unknown Junior theme: ${themeId}`);
  const questions = bank.questions.filter((q) => q.themeId === themeId);
  if (questions.length < MIN_QUESTION_TURNS) {
    throw new Error(`Junior theme ${themeId} has ${questions.length} questions; a mission needs ${MIN_QUESTION_TURNS}`);
  }
  if (theme.etToi.length === 0) throw new Error(`Junior theme ${themeId} has no « Et toi ? » turn`);

  const picked = shuffled(questions, random).slice(0, QUESTION_TURNS);
  const etToi = theme.etToi[Math.floor(random() * theme.etToi.length)];

  const turns: MissionTurn[] = [];
  if (!progress.demoSeen) turns.push({ kind: 'demo' });
  turns.push({ kind: 'warmup' });
  for (const q of picked) turns.push({ kind: 'question', questionId: q.id });
  turns.push({ kind: 'etToi', etToiId: etToi.id });
  return { themeId, turns };
}
