/**
 * Pronunciation Lab calibration — what to record, how recordings are named,
 * and the manifest the backend probe reads (pronunciation-lab plan §7).
 * Pure: `sheet.ts` and `prepare.ts` are the command-line wrappers.
 *
 * Three groups of recordings, all read from the same scripted target a
 * learner's take uses:
 *
 *   detection  the owner, each sentence twice            s01_correct.m4a  s01_swap.m4a
 *   fairness   other (accented) speakers, correct only   fair_asha_s01.m4a  (speaker id = asha)
 *   common     optional Common Voice clips + sentence    cv_12345.mp3 + cv_12345.txt
 */

import { basename, extname } from 'node:path';
import { CALIBRATION_SENTENCES, CALIBRATION_SET_VERSION, type CalibrationSentence } from './sentences';

export const AUDIO_EXTENSIONS = ['.m4a', '.mp3', '.wav', '.webm', '.ogg', '.mp4', '.aac', '.flac', '.opus'] as const;

export type ClipKind = 'detect-correct' | 'detect-swap' | 'fair' | 'common-voice';
export type SpeakerKind = 'owner' | 'accented' | 'common-voice';

export interface ManifestClip {
  clipId: string;
  kind: ClipKind;
  speaker: string;
  speakerKind: SpeakerKind;
  /** The sentence given to Azure as the target — always the ORIGINAL sentence, also for a swap reading. */
  targetText: string;
  sentenceId: string | null;
  /** Swap readings only. */
  swapWord: string | null;
  swapTo: string | null;
  /** Relative to the manifest file. */
  audioPath: string;
}

export interface Manifest {
  manifestFormat: 1;
  setVersion: string;
  clips: ManifestClip[];
}

export interface AudioFile {
  /** File name, e.g. `s01_swap.m4a`. */
  name: string;
  /** Path relative to the manifest. */
  path: string;
  /** Contents of a `<same name>.txt` next to the audio, if any. */
  sidecarText?: string | null;
}

export interface ManifestResult {
  manifest: Manifest;
  /** Files that matched no naming rule — never silently ignored. */
  unrecognised: string[];
  /** Detection files not present yet (e.g. `s07_swap`). */
  missingDetection: string[];
  problems: string[];
}

const SENTENCE_BY_ID = new Map(CALIBRATION_SENTENCES.map((s) => [s.id, s]));
const DETECT = /^(s\d{2})_(correct|swap)$/;
const FAIR = /^fair_([a-z0-9]+)_(s\d{2})$/;
const COMMON = /^cv_([A-Za-z0-9-]+)$/;

export function isAudioFile(name: string): boolean {
  return (AUDIO_EXTENSIONS as readonly string[]).includes(extname(name).toLowerCase());
}

/** Builds the manifest from the recordings found, reporting everything that does not fit. */
export function buildManifest(files: readonly AudioFile[]): ManifestResult {
  const clips: ManifestClip[] = [];
  const unrecognised: string[] = [];
  const problems: string[] = [];
  const ids = new Set<string>();

  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    const stem = basename(file.name, extname(file.name));
    let clip: ManifestClip | null = null;
    let m: RegExpMatchArray | null;

    if ((m = stem.match(DETECT))) {
      const sentence = SENTENCE_BY_ID.get(m[1]);
      if (!sentence) problems.push(`${file.name}: there is no sentence ${m[1]}`);
      else {
        const swap = m[2] === 'swap';
        clip = {
          clipId: stem, kind: swap ? 'detect-swap' : 'detect-correct', speaker: 'owner', speakerKind: 'owner',
          targetText: sentence.sentence, sentenceId: sentence.id,
          swapWord: swap ? sentence.swapWord : null, swapTo: swap ? sentence.swapTo : null, audioPath: file.path,
        };
      }
    } else if ((m = stem.match(FAIR))) {
      const sentence = SENTENCE_BY_ID.get(m[2]);
      if (!sentence) problems.push(`${file.name}: there is no sentence ${m[2]}`);
      else {
        clip = {
          clipId: stem, kind: 'fair', speaker: m[1], speakerKind: 'accented', targetText: sentence.sentence,
          sentenceId: sentence.id, swapWord: null, swapTo: null, audioPath: file.path,
        };
      }
    } else if ((m = stem.match(COMMON))) {
      const text = file.sidecarText?.trim();
      if (!text) problems.push(`${file.name}: a Common Voice clip needs a ${stem}.txt next to it holding its sentence`);
      else {
        clip = {
          clipId: stem, kind: 'common-voice', speaker: 'common-voice', speakerKind: 'common-voice', targetText: text,
          sentenceId: null, swapWord: null, swapTo: null, audioPath: file.path,
        };
      }
    } else {
      unrecognised.push(file.name);
    }

    if (clip) {
      if (ids.has(clip.clipId)) problems.push(`${file.name}: duplicate recording for ${clip.clipId} (keep one format)`);
      else {
        ids.add(clip.clipId);
        clips.push(clip);
      }
    }
  }

  const missingDetection: string[] = [];
  for (const s of CALIBRATION_SENTENCES) {
    for (const reading of ['correct', 'swap']) if (!ids.has(`${s.id}_${reading}`)) missingDetection.push(`${s.id}_${reading}`);
  }
  return { manifest: { manifestFormat: 1, setVersion: CALIBRATION_SET_VERSION, clips }, unrecognised, missingDetection, problems };
}

function row(s: CalibrationSentence): string {
  return `| ${s.id} | ${s.sentence} | **${s.swapWord}** → say “${s.swapTo}” |`;
}

/** The recording sheet the owner (and the other speakers) read from, as Markdown. */
export function renderSheet(): string {
  const ids = CALIBRATION_SENTENCES.map((s) => s.id);
  return `# Pronunciation Lab — calibration recordings

Set \`${CALIBRATION_SET_VERSION}\`. This is the test the Lab has to pass before word marks go to every learner
(plan §7). It is only worth anything if the recordings are honest, so please read these rules first.

## Rules (they matter more than the recordings)

1. **One natural take per file.** Normal speed, normal voice, the way a learner would say it. No exaggerating,
   no practising each sentence ten times first.
2. **Never re-record because the app scored you badly** — that makes the test pass on luck. Re-record only if you
   stumbled or said the wrong word by accident, and decide that before you hear any result.
3. **Say exactly the swapped word, and only that one.** Everything else in the sentence is read as written.
4. A quiet room, the phone a normal distance away. Voice Memos / Recorder is fine (m4a, mp3, wav, webm, ogg all work).
5. Don't edit or trim the audio.

## Part A — you (20 sentences × 2 readings = 40 files)

For every sentence record **two** files: first the sentence correctly, then again saying the other word in place
of the bold one.

| id | sentence | swapped reading |
|---|---|---|
${CALIBRATION_SENTENCES.map(row).join('\n')}

File names: \`${ids[0]}_correct.m4a\` and \`${ids[0]}_swap.m4a\`, …, \`${ids[ids.length - 1]}_correct.m4a\` and \`${ids[ids.length - 1]}_swap.m4a\`.

## Part B — other speakers with a real accent (the people the Lab is for)

Each speaker reads all 20 sentences **correctly** (no swaps) — 20 files per speaker. At least one speaker who is
not you is required; two or three is better, and Indian-accented French is exactly the case that matters.

File names: \`fair_<speaker>_s01.m4a\` … \`fair_<speaker>_s20.m4a\`, where \`<speaker>\` is a short lowercase
name or initials (letters and digits only, e.g. \`fair_asha_s01.m4a\`).

## Part C — optional: Common Voice

Any number of Common Voice clips (CC0) with the sentence they were reading. Save each as \`cv_<id>.mp3\` with a text file
\`cv_<id>.txt\` next to it containing the sentence. They count as one extra group; 20 or more are needed for them to count.

## Then

1. Put every file in one folder and run \`npm run lab:calibration:prepare -- --audio <folder> --out <folder>/manifest.json\`.
2. From the backend repo: \`python scripts/probe_lab_calibration.py --manifest <folder>/manifest.json\`
   (needs \`AZURE_SPEECH_KEY\`/\`AZURE_SPEECH_REGION\` in \`backend/.env\` and \`ffmpeg\` installed).
3. \`npm run lab:calibration:report\` — prints pass / fail / incomplete and why.
`;
}
