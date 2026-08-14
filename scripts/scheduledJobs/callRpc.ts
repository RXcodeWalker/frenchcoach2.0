/**
 * Generic scheduled-job runner: calls one service_role-only Postgres RPC by
 * name via the Supabase service key. Shared by every GitHub Actions cron job
 * (Phase 1's daily-challenge seed, Phase 3's weekly league assignment, etc.)
 * so each job is a one-line workflow rather than its own script.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/scheduledJobs/callRpc.ts <rpc_name> [json_args]
 *
 * json_args, if given, is passed as the RPC's params object (matches
 * supabase-js's db.rpc(name, params) shape). Exits non-zero on any error so
 * the GitHub Actions run is marked failed.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}

const [rpcName, rawArgs] = process.argv.slice(2);
if (!rpcName) {
  console.error('Usage: callRpc.ts <rpc_name> [json_args]');
  process.exit(1);
}

let params: Record<string, unknown> | undefined;
if (rawArgs) {
  try {
    params = JSON.parse(rawArgs);
  } catch (err) {
    console.error(`json_args is not valid JSON: ${(err as Error).message}`);
    process.exit(1);
  }
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await db.rpc(rpcName, params);
if (error) {
  console.error(`RPC ${rpcName} failed: ${error.message}`);
  process.exit(1);
}
console.log(`✓ ${rpcName}`, data ?? '');
