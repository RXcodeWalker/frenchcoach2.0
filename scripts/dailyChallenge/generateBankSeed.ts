/**
 * Writes the Daily Challenge bank seed migration into the backend repo
 * (daily-challenge-and-leagues §2.2).
 *
 *   npm run daily-challenge:seed                       # rewrites the newest seed migration
 *   npm run daily-challenge:seed -- <timestamp>        # writes a NEW migration <timestamp>_daily_challenge_bank_seed.sql
 *
 * Migrations are append-only once applied: after a bank change, pass a new
 * timestamp (later than every existing migration) so the change ships as its own
 * migration. The newest seed file defines the whole bank; the parity test fails
 * until it matches src/data/rebuildQuestions.ts.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderBankSeedSql } from '../../src/features/dailyChallenge/bank';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(__dirname, '..', '..', 'backend', 'supabase', 'migrations');
const SUFFIX = '_daily_challenge_bank_seed.sql';

const stamp = process.argv[2];
let file: string;
if (stamp) {
  if (!/^\d{14}$/.test(stamp)) throw new Error(`timestamp must be 14 digits (YYYYMMDDhhmmss), got ${stamp}`);
  file = `${stamp}${SUFFIX}`;
} else {
  const existing = readdirSync(MIGRATIONS).filter(f => f.endsWith(SUFFIX)).sort();
  if (existing.length === 0) throw new Error('no seed migration yet: pass a timestamp');
  file = existing[existing.length - 1];
}
writeFileSync(join(MIGRATIONS, file), renderBankSeedSql());
console.log(`wrote ${file}`);
