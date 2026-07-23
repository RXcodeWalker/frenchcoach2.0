/**
 * Renders one AuthoredQuestionSet as readable Markdown — natural French in
 * the body, authoring tags in a sidebar-style annotation — so a reviewer
 * (G2 linguistic, eventually G3 exam-realism) reads prose, not JSON. Pure
 * render function + a thin CLI wrapper, mirroring scripts/scoring/reporting's
 * renderAttemptTerminal.ts pattern.
 *
 *   npm run authoring:review-sheet -- 002
 *   npm run authoring:review-sheet -- 002 > review-002.md
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthoredQuestion, AuthoredQuestionSet, AuthoredTopic } from '../../src/data/exam/bank/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'igcse');

function tagLine(q: AuthoredQuestion): string {
  const tags: string[] = [];
  if (q.topicArea) tags.push(`area=${q.topicArea}`);
  if (q.subTopic) tags.push(`subTopic="${q.subTopic}"`);
  if (q.difficulty) tags.push(`difficulty=${q.difficulty}`);
  if (q.expectedTimeFrame) tags.push(`timeFrame=${q.expectedTimeFrame}`);
  if (q.targetStructures?.length) tags.push(`structures=[${q.targetStructures.join(', ')}]`);
  tags.push(`partsExpected=${q.partsExpected}`);
  return `  _${tags.join(' · ')}_`;
}

function renderQuestion(label: string, q: AuthoredQuestion): string[] {
  const lines: string[] = [];
  lines.push(`**${label}.** ${q.mainText}`);
  if (q.secondPartText) lines.push(`  ↳ *(second part)* ${q.secondPartText}`);
  lines.push(tagLine(q));
  for (let i = 0; i < q.alternativeTexts.length; i += 1) {
    lines.push(`  _alt ${i + 1}:_ ${q.alternativeTexts[i]}`);
  }
  lines.push('');
  return lines;
}

function renderTopic(title: string, topic: AuthoredTopic): string[] {
  const lines: string[] = [];
  lines.push(`### ${title} — ${topic.subTopic} (area ${topic.topicArea})`);
  lines.push('');
  topic.questions.forEach((q, i) => lines.push(...renderQuestion(`Q${i + 1}`, q)));
  lines.push('**Further questions** (asked only if the conversation needs extending):');
  lines.push(`1. ${topic.furtherQuestions[0]}`);
  lines.push(`2. ${topic.furtherQuestions[1]}`);
  lines.push('');
  return lines;
}

export function renderReviewSheet(set: AuthoredQuestionSet): string {
  const lines: string[] = [];
  const { rolePlay, topic1, topic2 } = set.content;

  lines.push(`# Review sheet — ${set.questionSetId}`);
  lines.push('');
  lines.push(`Status: **${set.review.status}**${set.review.reviewedBy ? ` · reviewedBy: ${set.review.reviewedBy}` : ''}`);
  if (set.review.notes) lines.push(`Notes: ${set.review.notes}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push(`## Role play — "${rolePlay.title}" (area ${rolePlay.topicArea})`);
  lines.push('');
  lines.push(`_Setup:_ ${rolePlay.setup}`);
  lines.push('');
  rolePlay.tasks.forEach((t, i) => lines.push(...renderQuestion(`T${i + 1}`, t)));
  lines.push('---');
  lines.push('');

  lines.push(...renderTopic('Topic 1', topic1));
  lines.push('---');
  lines.push('');
  lines.push(...renderTopic('Topic 2', topic2));

  return lines.join('\n');
}

function main(): void {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npm run authoring:review-sheet -- <NN|questionSetId>');
    process.exit(1);
  }
  const filename = /^\d+$/.test(arg)
    ? `original-practice-${arg.padStart(3, '0')}.json`
    : `${arg}.json`;
  const path = join(DATA_DIR, filename);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    console.error(`Could not read/parse ${path}`);
    process.exit(1);
  }

  console.log(renderReviewSheet(raw as AuthoredQuestionSet));
}

main();
