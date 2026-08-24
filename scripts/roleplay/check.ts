/**
 * Stage 2 validator CLI — `npm run roleplay:check`. Validates every scenario
 * in the registry (graph + meta + deck) against the rule table in
 * "Stage 2 — Validator" of the overhaul plan. Unauthored scenarios are
 * skipped (nothing to validate yet — they ship as locked stubs).
 */
import { listScenarios, isAuthored } from '../../src/data/scenarios/registry';
import { validateRegistry, type ScenarioEntryForValidation } from '../../src/features/roleplay/validate';

function main(): void {
  const entries: ScenarioEntryForValidation[] = listScenarios().map((entry) => ({
    id: entry.meta.id,
    meta: entry.meta,
    graph: entry.graph,
    deck: entry.deck,
    authored: isAuthored(entry.meta.id),
  }));

  const authoredCount = entries.filter((e) => e.authored).length;
  console.log(`Checking ${authoredCount} authored scenario(s) of ${entries.length} total\n`);

  const report = validateRegistry(entries);

  for (const err of report.errors) {
    console.log(`  ERROR [${err.code}] ${err.path}: ${err.message}`);
  }
  for (const warn of report.warnings) {
    console.log(`  WARN  [${warn.code}] ${warn.path}: ${warn.message}`);
  }
  if (report.errors.length === 0 && report.warnings.length === 0) {
    console.log('  clean');
  }

  console.log('');
  console.log(`Total: ${report.errors.length} error(s), ${report.warnings.length} warning(s).`);
  if (report.errors.length > 0) {
    process.exit(1);
  }
}

main();
