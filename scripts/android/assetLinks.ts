/**
 * Digital Asset Links: the file at `https://<host>/.well-known/assetlinks.json` that
 * proves the Android app and this website belong together. Without it the Trusted Web
 * Activity still opens, but shows Chrome's address bar like an ordinary browser tab.
 *
 * Pure helpers only (the CLI is `writeAssetLinks.ts`).
 */

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/**
 * Accepts a SHA-256 certificate fingerprint as Play Console / keytool print it
 * ("AB:CD:…", 32 bytes), with or without colons, any case. Returns the canonical
 * upper-case colon form, or null when it isn't one.
 */
export function normaliseFingerprint(raw: string): string | null {
  const hex = raw.trim().replace(/^SHA-?256:\s*/i, '').replace(/[:\s]/g, '').toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(hex)) return null;
  const canonical = hex.match(/.{2}/g)!.join(':');
  return FINGERPRINT.test(canonical) ? canonical : null;
}

/** Splits an env-var list ("A, B" or newline-separated). */
export function parseFingerprintList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
}

export interface AssetLinkStatement {
  relation: string[];
  target: { namespace: 'android_app'; package_name: string; sha256_cert_fingerprints: string[] };
}

/**
 * The statement list for one app. Throws on a malformed fingerprint (a typo here
 * silently brings the address bar back, so it must fail the build instead).
 */
export function buildAssetLinks(packageId: string, fingerprints: string[]): AssetLinkStatement[] {
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageId)) {
    throw new Error(`Invalid Android package id: ${packageId}`);
  }
  const unique: string[] = [];
  for (const raw of fingerprints) {
    const fp = normaliseFingerprint(raw);
    if (!fp) throw new Error(`Invalid SHA-256 certificate fingerprint: "${raw}"`);
    if (!unique.includes(fp)) unique.push(fp);
  }
  if (unique.length === 0) return [];
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: packageId, sha256_cert_fingerprints: unique },
    },
  ];
}
