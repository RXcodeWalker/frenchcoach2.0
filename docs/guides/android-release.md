# Releasing the Android app

The Android app is a **Trusted Web Activity (TWA)**: a tiny shell (`android/`) that opens
`https://french.beyondthebasics.me` full-screen in the phone's Chrome. Why this design and
not a WebView or a rewrite: `docs/plans/android-app.md` §1.

**What this means day to day:** website changes reach Android users the moment Vercel deploys
them. You only build and upload a new Android version when something in `android/` changes
(name, icon, colours, version number).

## What lives where

| File | What it is |
|---|---|
| `android/app-config.json` | **The one place** for the app's identity: package id, site, launch URL, name, version, colours, signing-key fingerprints. Both the Android build and the website build read it. |
| `android/app/` | The shell. No code of its own — Google's `androidbrowserhelper` library does the work. |
| `scripts/android/` | Icon generator (`npm run android:icons`) and the asset-links generator that runs at the end of `npm run build`. |
| `.github/workflows/android.yml` | Builds the app. Automatic debug build on changes to `android/`; signed release when run by hand. |
| `android/store/play-icon-512.png` | The 512×512 icon for the Play Store listing. |

## One-time setup

### 1. Decide the package id (before the first upload — it can never change after)

`android/app-config.json` → `packageId` is `french.beyondthebasics.me`. Change it now if you
want something else; after the first upload to Play it is permanent.

### 2. Create the upload key and put it in GitHub secrets

The upload key proves uploads come from you. It is a password-level secret: **never commit it,
never paste it into chat.** On your own computer (needs Java; Android Studio includes it):

```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and a name; remember the password. Then turn the file into text:

```bash
base64 -w0 upload.jks > upload.jks.txt
```

(On a Mac: `base64 -i upload.jks -o upload.jks.txt`.) In GitHub → the repo → Settings →
Secrets and variables → Actions → New repository secret, add:

| Secret | Value |
|---|---|
| `ANDROID_UPLOAD_KEYSTORE_BASE64` | the contents of `upload.jks.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | the password you chose |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | the same password (unless you set a different one for the key) |

Keep `upload.jks` somewhere safe (a password manager), then delete `upload.jks.txt`. If the
upload key is ever lost, Play support can reset it because Play App Signing holds the real key.

### 3. Build the first release

GitHub → Actions → **Android app** → Run workflow. When it finishes, download the
`android-release` artifact: `app-release.aab` (for Play) and `app-release.apk` (to install on a
phone directly). The log of the "Signed release build" step prints the upload key's `SHA256:`
fingerprint.

### 4. Create the app in Play Console and upload

Play Console → Create app → then Testing → **Internal testing** → Create release → upload
`app-release.aab`. Accept **Play App Signing** when asked (the default).

### 5. Connect the app and the website (removes the browser address bar)

Play Console → your app → Test and release → **App integrity** → App signing. Copy the
**SHA-256 certificate fingerprint** of the *App signing key* (and the *Upload key* one too).
Add both to `android/app-config.json`:

```json
"sha256CertFingerprints": [
  "AB:CD:…:EF",
  "12:34:…:56"
]
```

Commit and push; the next Vercel deploy publishes
`https://french.beyondthebasics.me/.well-known/assetlinks.json`. (Alternatively, set them in
Vercel as the env var `ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated — no commit needed.)
A typo fails the website build on purpose, so it can't silently break the app.

Check it worked:
`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://french.beyondthebasics.me&relation=delegate_permission/common.handle_all_urls`
should list your package id. Until it does, the app opens with Chrome's address bar showing.

## Every later Android release

1. Change what you need in `android/app-config.json` (or the icon art in
   `scripts/android/iconArt.ts`, then `npm run android:icons`).
2. **Bump `versionCode` by 1** (Play rejects a repeat) and set a new `versionName`.
3. Commit, push, Run workflow, upload the `.aab`.

## Testing on a phone before release

Install `app-release.apk` (from step 3) on an Android phone. The checklist is in
`docs/plans/android-app.md` §6. The things most likely to differ from desktop:

- **Back button** — mid-Learn-session and mid-exam it must ask before leaving.
- **Screen sleep** — leave the phone alone during the exam's 10-minute preparation; the screen
  should stay on.
- **Speech recognition** — run a full Exam Sim; Chrome on Android cuts recognition off after
  short pauses more readily than desktop Chrome.
- **Offline** — airplane mode, then open the app: it should still open (the offline banner shows, games and saved answers work), not a crash.
- **Notifications** — allow them when asked; a streak reminder should open the app.
- **Samsung phones whose default browser is Samsung Internet** — check the exam still hears you.
