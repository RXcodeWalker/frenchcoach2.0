/**
 * Renders one AuthoredQuestionSet as readable Markdown — natural French in
 * the body, authoring tags in a sidebar-style annotation — so a reviewer
 * (G2 linguistic, eventually G3 exam-realism) reads prose, not JSON. Pure
 * render function + a thin CLI wrapper, mirroring scripts/scoring/reporting's
 * renderAttemptTerminal.ts pattern.
 *
 *   npm run authoring:review-sheet -- 002
 *   npm run authoring:review-sheet -- 002 > review-002.md
 *   npm run authoring:review-sheet -- --all --glosses docs/guides/review/0520-g2-glosses.json > docs/guides/review/0520-g2-review.md
 *
 * `--glosses <file>` adds an English gloss under every French line, from a
 * JSON map of French text -> English (so a reviewer can check meaning at a
 * glance). `--all` renders every set in the data dir into one sheet.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthoredQuestion, AuthoredQuestionSet, AuthoredTopic } from '../../src/data/exam/bank/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'backend', 'data', 'igcse');

/** French text -> English gloss. */
export type Glosses = Readonly<Record<string, string>>;

function gloss(text: string, glosses: Glosses | undefined): string[] {
  if (!glosses) return [];
  const en = glosses[text];
  return [`  *EN: ${en ?? '(no gloss — add one to the glosses file)'}*`];
}

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

function renderQuestion(label: string, q: AuthoredQuestion, glosses?: Glosses): string[] {
  const lines: string[] = [];
  lines.push(`**${label}.** ${q.mainText}`);
  lines.push(...gloss(q.mainText, glosses));
  if (q.secondPartText) {
    lines.push(`  ↳ *(second part)* ${q.secondPartText}`);
    lines.push(...gloss(q.secondPartText, glosses));
  }
  lines.push(tagLine(q));
  // D9: alternativeTexts is the alternative question's ordered parts.
  for (let i = 0; i < q.alternativeTexts.length; i += 1) {
    lines.push(`  _alternative, part ${i + 1}:_ ${q.alternativeTexts[i]}`);
    lines.push(...gloss(q.alternativeTexts[i], glosses));
  }
  lines.push('');
  return lines;
}

function renderTopic(label: string, topic: AuthoredTopic, glosses?: Glosses): string[] {
  const lines: string[] = [];
  lines.push(`### ${label} — "${topic.title}" · ${topic.subTopic} (area ${topic.topicArea})`);
  lines.push(...gloss(topic.title, glosses));
  lines.push('');
  topic.questions.forEach((q, i) => lines.push(...renderQuestion(`Q${i + 1}`, q, glosses)));
  lines.push('**Further questions** (Exam Sim: only if the conversation lasts 3½ min or less; Coached: always):');
  topic.furtherQuestions.forEach((fq, i) => {
    lines.push(`${i + 1}. ${fq}`);
    lines.push(...gloss(fq, glosses));
  });
  lines.push('');
  return lines;
}

export function renderReviewSheet(set: AuthoredQuestionSet, glosses?: Glosses): string {
  const lines: string[] = [];
  const { rolePlay, topic1, topic2 } = set.content;

  lines.push(`# Review sheet — ${set.questionSetId}`);
  lines.push('');
  lines.push(`Status: **${set.review.status}**${set.review.reviewedBy ? ` · reviewedBy: ${set.review.reviewedBy}` : ''}`);
  if (set.review.notes) lines.push(`Notes: ${set.review.notes}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push(`## Role play — "${rolePlay.title}" (area ${rolePlay.topicArea}, examiner uses *${rolePlay.examinerRegister}*)`);
  lines.push(...gloss(rolePlay.title, glosses));
  lines.push('');
  lines.push(`_Setup (read aloud by the examiner):_ ${rolePlay.setup}`);
  lines.push(...gloss(rolePlay.setup, glosses));
  lines.push('');
  rolePlay.tasks.forEach((t, i) => lines.push(...renderQuestion(`T${i + 1}`, t, glosses)));
  lines.push('---');
  lines.push('');

  lines.push(...renderTopic('Topic 1', topic1, glosses));
  lines.push('---');
  lines.push('');
  lines.push(...renderTopic('Topic 2', topic2, glosses));

  // Two trailing spaces = a Markdown hard line break, so each French line, its
  // gloss and its tags render on their own lines instead of one paragraph.
  return lines.map((l) => (l === '' || l === '---' || l.startsWith('#') ? l : `${l}  `)).join('\n');
}

/** Header for the combined G2 sheet (`--all`): what the reviewer checks and how to report back. */
const G2_HEADER = `# G2 native-speaker review sheet — 0520 original question bank

> **G2 is WAIVED for these ten sets (owner decision, 2026-09-29; ADR 0008 Amendment).** They are
> approved on machine checks + self-review (G1), not native review. This sheet is kept so a reviewer
> can still run G2 at any time; nothing here blocks seeding or merging.

**Generated** by \`npm run authoring:review-sheet -- --all --glosses docs/guides/review/0520-g2-glosses.json\`
from \`french-coach-backend/data/igcse/*.json\`. Do not edit this file by hand — edit the JSON
(or the glosses file) and regenerate.

**Who (optional, since the waiver):** a native or near-native French speaker (content-authoring §15,
gate G2). The English glosses are there to confirm meaning quickly; they are not reviewed.

**Check every French line for:**
- Natural, correct French as a French examiner would say it aloud (the examiner reads every line
  exactly as printed and may only repeat it, never rephrase).
- Level: CEFR A2 with elements of B1 — a strong 15–16-year-old learner understands it without a gloss.
- Register: role-play lines use the register shown in the heading (*tu* or *vous*); every topic
  question uses *tu*.
- Each topic's questions stay on its one declared sub-topic.
- Nothing a 15–16-year-old may not have experienced is assumed.

**How to report:** for each problem, give the set id, the label (e.g. \`003 · Topic 2 · Q4 · second
part\`) and a suggested rewrite. When a set is clean, say so. Reported problems are fixed like any other
authoring change; they do not gate seeding while the waiver stands.

`;

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    console.error(`Could not read/parse ${path}`);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const glossIdx = args.indexOf('--glosses');
  const glosses = glossIdx >= 0 ? (readJson(resolve(process.cwd(), args[glossIdx + 1])) as Glosses) : undefined;
  const positional = args.filter((a, i) => !a.startsWith('--') && (glossIdx < 0 || i !== glossIdx + 1));

  if (args.includes('--all')) {
    const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort();
    const sheets = files.map((f) => renderReviewSheet(readJson(join(DATA_DIR, f)) as AuthoredQuestionSet, glosses));
    console.log(G2_HEADER + sheets.join('\n\n---\n\n'));
    return;
  }

  const arg = positional[0];
  if (!arg) {
    console.error('Usage: npm run authoring:review-sheet -- <NN|questionSetId> [--glosses <file>]  |  --all [--glosses <file>]');
    process.exit(1);
  }
  const filename = /^\d+$/.test(arg)
    ? `original-practice-${arg.padStart(3, '0')}.json`
    : `${arg}.json`;

  console.log(renderReviewSheet(readJson(join(DATA_DIR, filename)) as AuthoredQuestionSet, glosses));
}

main();
