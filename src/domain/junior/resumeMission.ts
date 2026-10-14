/**
 * Resuming an unfinished mission (junior-track §10: "resume from the last
 * finished turn for up to 24 h").
 *
 * The stored mission (`ActiveMission`) holds the theme, the start time and one
 * `{turnId, outcome}` per finished question turn, where `turnId` is the
 * question id. It does not store the question order, so a resume rebuilds the
 * rest: the already-finished questions are skipped (they are not asked again,
 * and are never re-recorded), and the remaining question turns are the
 * theme's unplayed questions, up to the usual mission length. The first-run
 * demo is not repeated, but the warm-up is: it is what picks the recogniser
 * for this sitting and what teaches the mic button.
 *
 * Pure: randomness is injected so tests are deterministic.
 */
import type { JuniorBank } from '../../data/junior/types';
import { QUESTION_TURNS, type Mission, type MissionTurn } from './buildMission';

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function resumeMission(
  bank: Pick<JuniorBank, 'themes' | 'questions'>,
  themeId: string,
  doneQuestionIds: readonly string[],
  random: () => number = Math.random,
): Mission {
  const theme = bank.themes.find((t) => t.id === themeId);
  if (!theme) throw new Error(`Unknown Junior theme: ${themeId}`);
  if (theme.etToi.length === 0) throw new Error(`Junior theme ${themeId} has no « Et toi ? » turn`);
  const done = new Set(doneQuestionIds);
  const unplayed = bank.questions.filter((q) => q.themeId === themeId && !done.has(q.id));
  const wanted = Math.max(0, QUESTION_TURNS - done.size);
  // A theme that has run out of fresh questions still finishes with « Et toi ? ».
  const picked = shuffled(unplayed, random).slice(0, Math.min(wanted, unplayed.length));
  const etToi = theme.etToi[Math.floor(random() * theme.etToi.length)];

  const turns: MissionTurn[] = [{ kind: 'warmup' }];
  for (const q of picked) turns.push({ kind: 'question', questionId: q.id });
  turns.push({ kind: 'etToi', etToiId: etToi.id });
  return { themeId, turns };
}

