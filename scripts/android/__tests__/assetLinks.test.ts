import { describe, expect, it } from 'vitest';
import { buildAssetLinks, normaliseFingerprint, parseFingerprintList } from '../assetLinks';
import { readAppConfig } from '../appConfig';

const FP = '14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5';

describe('asset links', () => {
  it('normalises the forms Play Console and keytool print', () => {
    expect(normaliseFingerprint(FP)).toBe(FP);
    expect(normaliseFingerprint(FP.toLowerCase().replace(/:/g, ''))).toBe(FP);
    expect(normaliseFingerprint(`SHA256: ${FP}`)).toBe(FP);
    expect(normaliseFingerprint('AB:CD')).toBeNull();
    expect(normaliseFingerprint('')).toBeNull();
  });

  it('builds one statement with de-duplicated keys', () => {
    expect(buildAssetLinks('me.example.app', [FP, FP.toLowerCase()])).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: 'me.example.app', sha256_cert_fingerprints: [FP] },
      },
    ]);
  });

  it('writes nothing without a key, and fails the build on a typo', () => {
    expect(buildAssetLinks('me.example.app', [])).toEqual([]);
    expect(() => buildAssetLinks('me.example.app', ['AB:CD'])).toThrow(/fingerprint/);
    expect(() => buildAssetLinks('Not A Package', [FP])).toThrow(/package id/);
  });

  it('parses an env-var list', () => {
    expect(parseFingerprintList(` ${FP}, ${FP}\n`)).toEqual([FP, FP]);
    expect(parseFingerprintList(undefined)).toEqual([]);
  });

  it('the committed app config is valid', () => {
    const config = readAppConfig();
    expect(() => buildAssetLinks(config.packageId, config.sha256CertFingerprints)).not.toThrow();
    expect(config.launchPath.startsWith('/')).toBe(true);
    expect(Number.isInteger(config.versionCode) && config.versionCode >= 1).toBe(true);
  });
});
