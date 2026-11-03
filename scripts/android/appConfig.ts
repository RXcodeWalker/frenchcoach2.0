/**
 * `android/app-config.json` — the one source for the Android app's identity
 * (package id, host, colours, signing-key fingerprints). Read by the Gradle build
 * (`android/app/build.gradle`), the asset-links generator and the icon generator.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface AndroidAppConfig {
  packageId: string;
  host: string;
  launchPath: string;
  appName: string;
  launcherName: string;
  versionCode: number;
  versionName: string;
  colors: {
    light: { statusBar: string; navigationBar: string; background: string };
    dark: { statusBar: string; navigationBar: string };
    brandStart: string;
    brandEnd: string;
  };
  sha256CertFingerprints: string[];
}

export const APP_CONFIG_PATH = fileURLToPath(new URL('../../android/app-config.json', import.meta.url));

export function readAppConfig(path = APP_CONFIG_PATH): AndroidAppConfig {
  return JSON.parse(readFileSync(path, 'utf8')) as AndroidAppConfig;
}
