/**
 * Offline support — which app versions the service worker keeps (pure, tested;
 * `serviceWorker.ts` is the only caller).
 *
 * Since code splitting, the app is ~230 small files instead of one. The hashed
 * files (`/assets/*`) live once in a shared cache, whatever version they came
 * from; each version's precache holds its shell and a manifest listing the
 * hashed files it needs. That gives three things:
 *
 * - **A deploy downloads only what changed.** Install skips every file already
 *   on the device (most of them — vendor code and untouched screens keep their
 *   names), and an interrupted install picks up where it stopped.
 * - **An open tab keeps working after a deploy.** The new worker takes over at
 *   once, but a tab still running the previous version asks for that version's
 *   screens as the learner moves around — so the last few versions' files stay.
 * - **Storage stays bounded.** Files no kept version lists are deleted.
 */

/** The current version plus this many earlier ones keep their files. */
export const KEPT_PREVIOUS_VERSIONS = 2;

/** An install that never finished keeps its files this long (it may be running right now), then goes. */
export const INCOMPLETE_INSTALL_GRACE_MS = 24 * 60 * 60 * 1000;

/** Where a version's manifest is stored inside its precache (never a real URL). */
export const MANIFEST_PATH = '/__fc/precache-manifest.json';

export interface PrecacheManifest {
  /** When this version's install started (ms). */
  installedAt: number;
  /** Every hashed file (`/assets/…`) this version needs. */
  assets: string[];
  /** False until every file is cached. */
  complete: boolean;
}

export interface PrecacheEntry {
  /** Cache name, `fc-precache-<version>`. */
  name: string;
  /** Null when unreadable or written by a worker that had no manifests. */
  manifest: PrecacheManifest | null;
}

export interface RetentionPlan {
  /** Precache names to delete. */
  remove: string[];
  /** Hashed-file paths still needed; anything else in the shared cache can go. */
  keepAssets: Set<string>;
}

export function planRetention(current: string, precaches: readonly PrecacheEntry[], now: number): RetentionPlan {
  const keep = new Set<string>([current]);
  const completeOthers = precaches
    .filter((p) => p.name !== current && p.manifest?.complete)
    .sort((a, b) => b.manifest!.installedAt - a.manifest!.installedAt)
    .slice(0, KEPT_PREVIOUS_VERSIONS);
  for (const p of completeOthers) keep.add(p.name);
  for (const p of precaches) {
    if (p.manifest && !p.manifest.complete && now - p.manifest.installedAt < INCOMPLETE_INSTALL_GRACE_MS) keep.add(p.name);
  }

  const keepAssets = new Set<string>();
  for (const p of precaches) {
    if (keep.has(p.name)) for (const a of p.manifest?.assets ?? []) keepAssets.add(a);
  }
  return { remove: precaches.filter((p) => !keep.has(p.name)).map((p) => p.name), keepAssets };
}

export function parseManifest(value: unknown): PrecacheManifest | null {
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  if (typeof m.installedAt !== 'number' || typeof m.complete !== 'boolean' || !Array.isArray(m.assets)) return null;
  if (!m.assets.every((a) => typeof a === 'string')) return null;
  return { installedAt: m.installedAt, complete: m.complete, assets: m.assets as string[] };
}
