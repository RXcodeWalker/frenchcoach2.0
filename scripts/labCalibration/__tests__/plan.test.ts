import { describe, expect, it } from 'vitest';
import { buildManifest, isAudioFile, renderSheet, type AudioFile } from '../plan';
import { CALIBRATION_SENTENCES } from '../sentences';

const f = (name: string, sidecarText?: string): AudioFile => ({ name, path: `audio/${name}`, sidecarText });

describe('buildManifest', () => {
  it('reads the owner’s detection files: the target is always the ORIGINAL sentence, a swap also names the word', () => {
    const { manifest, problems, unrecognised } = buildManifest([f('s01_correct.m4a'), f('s01_swap.m4a')]);
    expect(problems).toEqual([]);
    expect(unrecognised).toEqual([]);
    const [correct, swap] = manifest.clips;
    expect(correct).toMatchObject({ clipId: 's01_correct', kind: 'detect-correct', speaker: 'owner', swapWord: null });
    expect(swap).toMatchObject({ clipId: 's01_swap', kind: 'detect-swap', swapWord: 'tout', swapTo: 'tu' });
    expect(swap.targetText).toBe(CALIBRATION_SENTENCES[0].sentence);
    expect(correct.targetText).toBe(swap.targetText);
    expect(swap.audioPath).toBe('audio/s01_swap.m4a');
  });

  it('reads accented speakers’ fairness files and Common Voice clips with their sentence', () => {
    const { manifest, problems } = buildManifest([f('fair_asha_s03.mp3'), f('cv_998.mp3', 'Bonjour tout le monde.\n')]);
    expect(problems).toEqual([]);
    expect(manifest.clips.find((c) => c.clipId === 'fair_asha_s03')).toMatchObject({ kind: 'fair', speaker: 'asha', speakerKind: 'accented', sentenceId: 's03' });
    expect(manifest.clips.find((c) => c.clipId === 'cv_998')).toMatchObject({ kind: 'common-voice', targetText: 'Bonjour tout le monde.' });
  });

  it('reports what does not fit instead of ignoring it', () => {
    const r = buildManifest([f('notes.m4a'), f('s99_swap.m4a'), f('cv_1.mp3'), f('s02_correct.m4a'), f('s02_correct.wav')]);
    expect(r.unrecognised).toEqual(['notes.m4a']);
    expect(r.problems.join('\n')).toMatch(/no sentence s99/);
    expect(r.problems.join('\n')).toMatch(/cv_1\.mp3: a Common Voice clip needs a cv_1\.txt/);
    expect(r.problems.join('\n')).toMatch(/duplicate recording for s02_correct/);
  });

  it('lists which of the owner’s 40 files are still missing', () => {
    const r = buildManifest([f('s01_correct.m4a')]);
    expect(r.missingDetection).toHaveLength(39);
    expect(r.missingDetection).toContain('s01_swap');
    expect(buildManifest([]).missingDetection).toHaveLength(40);
  });
});

describe('isAudioFile / renderSheet', () => {
  it('recognises audio by extension, case-insensitively', () => {
    expect(isAudioFile('a.M4A')).toBe(true);
    expect(isAudioFile('a.txt')).toBe(false);
  });

  it('the sheet lists every sentence and swap, the honesty rules and the file naming', () => {
    const sheet = renderSheet();
    for (const s of CALIBRATION_SENTENCES) {
      expect(sheet).toContain(s.sentence);
      expect(sheet).toContain(`say “${s.swapTo}”`);
    }
    expect(sheet).toMatch(/Never re-record because the app scored you badly/);
    expect(sheet).toContain('fair_<speaker>_s01.m4a');
    expect(sheet).toContain('s01_swap.m4a');
  });
});
