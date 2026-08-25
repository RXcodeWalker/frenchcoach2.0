/**
 * Stage 2 tooling (first consumed in bulk by Stage 9) — `npm run roleplay:skeleton -- <id>`.
 *
 * Reads one scenario's graph JSON, extracts distinct content words from every
 * `prompt[]` line, and emits:
 *   - a deck skeleton (`<id>.deck.ts`) with `usedInStates` pre-filled from the
 *     prompt lines a word actually appears in, so provenance (the Stage 2
 *     `deck-provenance-mismatch` rule) is correct by construction — the
 *     author fills in `en`/`gender`/`article`/etc., not `usedInStates`.
 *   - a trigger stub (printed to stdout, not written to a file) for every
 *     state with >1 sibling intent, one BranchTrigger per intent with the
 *     intent name itself as a placeholder search term.
 *
 * Deliberately does not emit `.meta.ts` — branches, missions, NPC identity,
 * and briefing are authorial judgement calls with no mechanical source, so
 * generating a fake one would just be scaffolding to delete. The trigger
 * stub is emitted (not the whole meta file) because triggers *do* have a
 * mechanical starting point: every intent name is itself a candidate term.
 *
 * A stopword list keeps the deck skeleton from proposing function words
 * ("je", "vous", "le", ...) as vocab entries — those are never `core`/`extend`
 * candidates in this corpus (see corpus-matrix / authoring-guide conventions).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScenarioGraph } from '../../src/features/roleplay/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = join(__dirname, '..', '..', 'src', 'data', 'scenarios');

const STOPWORDS = new Set([
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd',
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
  'ce', 'cet', 'cette', 'ces', 'ca', 'c', 'y', 'en',
  'est', 'sont', 'suis', 'es', 'sommes', 'etes', 'ai', 'as', 'a', 'avons', 'avez', 'ont',
  'pas', 'plus', 'ne', 'me', 'te', 'se', 'lui', 'leur', 'moi', 'toi',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leurs',
  'pour', 'avec', 'sans', 'dans', 'sur', 'sous', 'chez', 'par', 'vers',
  'oui', 'non', 'si', 'bien', 'tres', 'aussi', 'ici', 'la-bas',
  'bonjour', 'bonsoir', 'salut', 'merci', 'pardon', 'excusez', 'excusez-moi',
  'alors', 'voila', 'voici', 'donc', 'ca-va', 'euh',
  'un-peu', 'peu', 'tout', 'toute', 'tous', 'toutes', 'meme', 'quelque', 'quelques',
  'au', 'aux', 'quel', 'quelle', 'quels', 'quelles',
]);

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function contentWords(line: string): string[] {
  return normalize(line)
    .split(/[^a-z0-9'-]+/)
    .filter(Boolean)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

interface DeckSkeletonEntry {
  fr: string;
  usedInStates: string[];
}

function buildDeckSkeleton(graph: ScenarioGraph): DeckSkeletonEntry[] {
  const wordToStates = new Map<string, Set<string>>();
  for (const [stateId, state] of Object.entries(graph)) {
    for (const line of state.prompt ?? []) {
      for (const word of contentWords(line)) {
        if (!wordToStates.has(word)) wordToStates.set(word, new Set());
        wordToStates.get(word)!.add(stateId);
      }
    }
  }
  return Array.from(wordToStates.entries())
    .map(([fr, states]) => ({ fr, usedInStates: Array.from(states).sort() }))
    .sort((a, b) => a.fr.localeCompare(b.fr));
}

interface TriggerStub {
  state: string;
  intent: string;
  siblingCount: number;
}

function buildTriggerStubs(graph: ScenarioGraph): TriggerStub[] {
  const stubs: TriggerStub[] = [];
  for (const [stateId, state] of Object.entries(graph)) {
    if (!state.intents) continue;
    const intents = Object.keys(state.intents);
    if (intents.length <= 1) continue;
    for (const intent of intents) {
      stubs.push({ state: stateId, intent, siblingCount: intents.length });
    }
  }
  return stubs;
}

function renderDeckSkeleton(scenarioId: string, entries: DeckSkeletonEntry[]): string {
  const camel = scenarioId.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const lines: string[] = [];
  lines.push(`import type { ScenarioDeck } from '../../features/roleplay/types';`);
  lines.push('');
  lines.push(`// AUTO-GENERATED SKELETON by \`npm run roleplay:skeleton -- ${scenarioId}\`.`);
  lines.push(`// usedInStates is provenance-correct by construction (matches Stage 2's`);
  lines.push(`// deck-provenance-mismatch rule) — fill in en/pos/gender/article/register/etc.`);
  lines.push(`// and delete entries that aren't worth teaching. Run \`npm run roleplay:check\`.`);
  lines.push(`export const ${camel}Deck: ScenarioDeck = {`);
  lines.push(`  entries: [`);
  for (const entry of entries) {
    lines.push(`    {`);
    lines.push(`      fr: ${JSON.stringify(entry.fr)}, en: 'TODO', pos: 'noun',`);
    lines.push(`      register: 'neutral', usedInStates: ${JSON.stringify(entry.usedInStates)}, rank: 'extend',`);
    lines.push(`    },`);
  }
  lines.push(`  ],`);
  lines.push(`};`);
  lines.push('');
  return lines.join('\n');
}

function renderTriggerStubs(scenarioId: string, stubs: TriggerStub[]): string {
  const lines: string[] = [];
  lines.push(`// Trigger stubs for ${scenarioId} — ${stubs.length} (state, intent) pairs with >1 sibling.`);
  lines.push(`// Paste into <id>.meta.ts's \`triggers: []\`, replace the placeholder term with real French.`);
  for (const stub of stubs) {
    lines.push(
      `  { state: '${stub.state}', intent: '${stub.intent}', terms: ['${stub.intent}'] }, // ${stub.siblingCount} siblings`,
    );
  }
  return lines.join('\n');
}

function main(): void {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: npm run roleplay:skeleton -- <scenarioId>');
    process.exit(1);
  }
  const graphPath = join(SCENARIOS_DIR, `${id}.json`);
  if (!existsSync(graphPath)) {
    console.error(`No graph found at ${graphPath}`);
    process.exit(1);
  }
  const graph = JSON.parse(readFileSync(graphPath, 'utf-8')) as ScenarioGraph;

  const deckEntries = buildDeckSkeleton(graph);
  const triggerStubs = buildTriggerStubs(graph);

  const deckPath = join(SCENARIOS_DIR, `${id}.deck.ts`);
  if (existsSync(deckPath)) {
    console.error(`${deckPath} already exists — refusing to overwrite authored content.`);
    process.exit(1);
  }
  writeFileSync(deckPath, renderDeckSkeleton(id, deckEntries), 'utf-8');
  console.log(`Wrote ${deckEntries.length}-entry deck skeleton to ${deckPath}`);

  console.log('');
  console.log(renderTriggerStubs(id, triggerStubs));
}

main();
