/**
 * Why a Supabase RPC failed, as a closed reason a screen can word.
 *
 * - `not_deployed`: PostgREST cannot find the function (PGRST202) — the backend migration
 *   that adds it has not been applied yet. Screens say "being switched on", not "error".
 * - `signed_out`: the RPC raised `not_authenticated`.
 * - `offline`: the request never reached the server.
 * - any code from `known` that appears in the message (the RPC's own RAISE text).
 * - `error`: anything else.
 */
export type RpcFailure<K extends string = never> = 'not_deployed' | 'signed_out' | 'offline' | 'error' | K;

interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
}

export function classifyRpcError<K extends string>(
  error: PostgrestLikeError,
  known: readonly K[] = [],
): RpcFailure<K> {
  const message = error.message ?? '';
  if (error.code === 'PGRST202' || /could not find the function/i.test(message)) return 'not_deployed';
  if (message.includes('not_authenticated') || error.code === '28000') return 'signed_out';
  for (const k of known) if (message.includes(k)) return k;
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'offline';
  return 'error';
}
