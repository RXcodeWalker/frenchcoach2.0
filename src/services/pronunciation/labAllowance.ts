/**
 * Read-only Pronunciation Lab allowance (backend GET /api/pronunciation/allowance;
 * plan Stage 7, owner D3: 30 checked takes per account per day, UTC day). Charges
 * nothing. null when it could not be read — the Lab then shows no counter and
 * the server's own cap still applies.
 */
import { getAccessToken } from '../../lib/authToken';

// Same base as pronunciationClient.ts: Vercel proxies '/api/*' in production.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

export interface LabAllowance {
  limit: number;
  used: number;
  remaining: number;
  /** ISO time the allowance resets (00:00 UTC). */
  resetsAt: string;
}

export async function getLabAllowance(): Promise<LabAllowance | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/api/pronunciation/allowance`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<LabAllowance>;
    if (typeof data.limit !== 'number' || typeof data.remaining !== 'number') return null;
    return {
      limit: data.limit,
      used: typeof data.used === 'number' ? data.used : data.limit - data.remaining,
      remaining: Math.max(0, data.remaining),
      resetsAt: String(data.resetsAt ?? ''),
    };
  } catch {
    return null;
  }
}
