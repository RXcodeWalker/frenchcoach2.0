// The recording checklist and the folder of recorded files must agree (junior-track §7, §11).
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { JUNIOR_AUDIO_DIR, JUNIOR_AUDIO_FILES, JUNIOR_BANK, allBankLines, audioUrl, requiredAudioIds } from '../index';
import { sentenceAudioId } from '../sentence';

const ROOT = join(__dirname, '../../../..');
const FOLDER = join(ROOT, 'public', JUNIOR_AUDIO_DIR);

describe('Junior audio manifest', () => {
  const required = requiredAudioIds(JUNIOR_BANK);

  it('lists every line and every model sentence Léo can say, once each', () => {
    expect(new Set(required).size).toBe(required.length);
    for (const l of allBankLines(JUNIOR_BANK)) expect(required).toContain(l.audioId);
    for (const q of JUNIOR_BANK.questions) {
      q.frames.forEach((f, i) => f.slotOptions.forEach((o) => expect(required).toContain(sentenceAudioId(q.id, i, o.id))));
    }
  });

  it('every audio id is a safe file name', () => {
    expect(required.filter((id) => !/^[a-z0-9_.-]+$/i.test(id))).toEqual([]);
  });

  it('only lists recorded files for ids the bank actually uses', () => {
    expect([...JUNIOR_AUDIO_FILES].filter((id) => !required.includes(id))).toEqual([]);
  });

  it('the manifest and public/audio/junior agree exactly: no listed file missing, no recorded file unlisted', () => {
    const onDisk = existsSync(FOLDER)
      ? readdirSync(FOLDER).filter((n) => n.endsWith('.mp3')).map((n) => n.replace(/\.mp3$/, ''))
      : [];
    expect(onDisk.sort()).toEqual([...JUNIOR_AUDIO_FILES].sort());
  });

  it('maps an id to its file under /audio/junior', () => {
    expect(audioUrl('praise.super')).toBe('/audio/junior/praise.super.mp3');
  });
});
