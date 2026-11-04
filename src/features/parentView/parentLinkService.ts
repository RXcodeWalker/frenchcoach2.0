/**
 * Parent view RPCs (backend migration 20261104090000). The learner creates,
 * lists and revokes links from Profile; a parent opens `/parent#<token>` and the
 * page calls `get_parent_report` — anon-callable, so the parent needs no account.
 *
 * The token rides in the URL hash on purpose: a hash is never sent to a server,
 * and analytics/Sentry strip it, so the token cannot leak into a log.
 */
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { parseRawReport, type RawParentReport } from './rawReport';

export type ParentLinkErrorCode = 'invalid_link' | 'too_many_links' | 'link_not_found' | 'not_authenticated' | 'not_available' | 'network_error' | 'unknown';

export class ParentLinkError extends Error {
  code: ParentLinkErrorCode;
  constructor(code: ParentLinkErrorCode, message: string) {
    super(message);
    this.name = 'ParentLinkError';
    this.code = code;
  }
}

const KNOWN: ParentLinkErrorCode[] = ['invalid_link', 'too_many_links', 'link_not_found', 'not_authenticated'];

function mapError(error: { message?: string; code?: string }): ParentLinkError {
  const message = error.message ?? '';
  const found = KNOWN.find(c => message.includes(c));
  if (found) return new ParentLinkError(found, message);
  // PGRST202 = function not found: the migration isn't applied to this database yet.
  if (error.code === 'PGRST202' || /could not find the function/i.test(message)) return new ParentLinkError('not_available', message);
  if (/fetch|network/i.test(message)) return new ParentLinkError('network_error', message);
  return new ParentLinkError('unknown', message);
}

export interface ParentLink {
  id: string;
  label: string;
  createdAt: string;
  lastViewedAt: string | null;
  viewCount: number;
}

export interface CreatedParentLink extends ParentLink {
  /** Raw token, returned once. Only its sha256 is stored. */
  token: string;
}

const TOKEN_RE = /^[0-9a-f]{64}$/;

export function buildParentLink(token: string, origin: string = window.location.origin): string {
  return `${origin}/parent#${token}`;
}

/** Reads the token out of `location.hash` (`#<token>`); null when it isn't one. */
export function tokenFromHash(hash: string): string | null {
  const t = hash.replace(/^#/, '').trim().toLowerCase();
  return TOKEN_RE.test(t) ? t : null;
}

function requireConfigured(): void {
  if (!supabaseConfigured) throw new ParentLinkError('not_available', 'supabase not configured');
}

export async function createParentLink(label: string): Promise<CreatedParentLink> {
  requireConfigured();
  const { data, error } = await supabase.rpc('create_parent_link', { p_label: label.trim().slice(0, 40) });
  if (error) throw mapError(error);
  const d = data as { id: string; token: string; label: string; createdAt: string };
  return { id: d.id, token: d.token, label: d.label, createdAt: d.createdAt, lastViewedAt: null, viewCount: 0 };
}

export async function listParentLinks(): Promise<ParentLink[]> {
  requireConfigured();
  const { data, error } = await supabase.rpc('list_parent_links');
  if (error) throw mapError(error);
  return Array.isArray(data) ? (data as ParentLink[]) : [];
}

export async function revokeParentLink(id: string): Promise<void> {
  requireConfigured();
  const { error } = await supabase.rpc('revoke_parent_link', { p_id: id });
  if (error) throw mapError(error);
}

export async function fetchParentReport(token: string): Promise<RawParentReport> {
  requireConfigured();
  const { data, error } = await supabase.rpc('get_parent_report', { p_token: token });
  if (error) throw mapError(error);
  const parsed = parseRawReport(data);
  if (!parsed) throw new ParentLinkError('unknown', 'malformed report');
  return parsed;
}
