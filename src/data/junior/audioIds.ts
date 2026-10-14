/**
 * Every audio id the Junior bank can ask Léo to say: the recording checklist.
 * Lines (questions, titles, « Et toi ? » asks and replies, level-ups, the praise
 * set, the warm-up, « On le dit ensemble ! ») plus the model sentence of every
 * (question, frame, picture) — the sentence Léo says back in the Echo step.
 */
import { sentenceAudioId } from './sentence';
import type { JuniorBank, JuniorLine } from './types';

export function allBankLines(bank: JuniorBank): JuniorLine[] {
  return [
    ...bank.fixedLines,
    ...bank.patterns.map((p) => p.levelUp),
    ...bank.themes.flatMap((t) => [t.title, ...t.etToi.flatMap((e) => [e.ask, e.reply])]),
    ...bank.questions.map((q) => q.prompt),
  ];
}

export function requiredAudioIds(bank: JuniorBank): string[] {
  const ids = new Set<string>(allBankLines(bank).map((l) => l.audioId));
  for (const q of bank.questions) {
    q.frames.forEach((f, i) => f.slotOptions.forEach((o) => ids.add(sentenceAudioId(q.id, i, o.id))));
  }
  return [...ids];
}
