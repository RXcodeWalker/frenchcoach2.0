/**
 * Renders one topic's LearnDemandsFile as a readable Markdown review sheet —
 * question text, inferred demands, derived level, and confidence — for a
 * human to correct in the JSON (docs §13.3: review is file-based, since
 * contentClient.isSupabaseAvailable() is unconditionally false for Learn).
 *
 *   npm run learn:review -- --topic school
 *   npm run learn:review -- --topic school --sort confidence
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveDemandLevel } from '../../src/domain/learn/demand/deriveDemandLevel';
import { QUESTIONS } from '../../src/data/questions';
import type { LearnDemandsEntry, LearnDemandsFile } from '../../src/domain/learn/demand/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data', 'learn', 'demands');

function tagLine(entry: LearnDemandsEntry): string {
  const { demands } = entry;
  const level = deriveDemandLevel(demands);
  const tags = [
    `cognitiveDemand=${demands.cognitiveDemand}`,
    `timeFrames=[${demands.timeFrames.join(', ')}]`,
    `structures=[${demands.structures.join(', ')}]`,
    `responseLoad=${demands.responseLoad}`,
    `lexicalReach=${demands.lexicalReach}`,
    `provenance=${demands.provenance}`,
  ];
  if (demands.inferenceConfidence !== undefined) {
    tags.push(`inferenceConfidence=${demands.inferenceConfidence}`);
  }
  tags.push(`derivedLevel=${level}`);
  return `  _${tags.join(' · ')}_`;
}

export function renderReviewSheet(file: LearnDemandsFile, questionTextById: ReadonlyMap<string, string>): string {
  const lines: string[] = [];
  lines.push(`# Learn demands review sheet — ${file.topicKey}`);
  lines.push('');
  lines.push(`${file.entries.length} entries.`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const entry of file.entries) {
    const text = questionTextById.get(entry.questionId) ?? '(question text not found)';
    lines.push(`## ${entry.questionId}`);
    lines.push('');
    lines.push(text);
    lines.push('');
    lines.push(tagLine(entry));
    lines.push(`  _sufficientAnswer:_ ${entry.demands.sufficientAnswer}`);
    lines.push(`  _review:_ status=${entry.review.status}${entry.review.reviewedBy ? `, reviewedBy=${entry.review.reviewedBy}` : ''}`);
    lines.push('');
  }

  return lines.join('\n');
}

function sortEntries(entries: LearnDemandsEntry[], sortKey: string | undefined): LearnDemandsEntry[] {
  if (sortKey === 'confidence') {
    return [...entries].sort(
      (a, b) => (a.demands.inferenceConfidence ?? 1) - (b.demands.inferenceConfidence ?? 1),
    );
  }
  return entries;
}

function main(): void {
  const args = process.argv.slice(2);
  const topicIndex = args.indexOf('--topic');
  const topicKey = topicIndex >= 0 ? args[topicIndex + 1] : undefined;
  if (!topicKey) {
    console.error('Usage: npm run learn:review -- --topic <topicKey> [--sort confidence]');
    process.exit(1);
  }
  const sortIndex = args.indexOf('--sort');
  const sortKey = sortIndex >= 0 ? args[sortIndex + 1] : undefined;

  const path = join(DATA_DIR, `${topicKey}.json`);
  let raw: LearnDemandsFile;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8')) as LearnDemandsFile;
  } catch {
    console.error(`Could not read/parse ${path}`);
    process.exit(1);
  }

  const sorted: LearnDemandsFile = { ...raw, entries: sortEntries(raw.entries, sortKey) };
  const questionTextById = new Map(QUESTIONS.map((q) => [q.id, q.text]));
  console.log(renderReviewSheet(sorted, questionTextById));
}

main();
