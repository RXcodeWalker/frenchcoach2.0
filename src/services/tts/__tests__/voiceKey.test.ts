import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  RECORDED_VOICES,
  TTS_BUCKET,
  VOICE_KEY_VERSION,
  normalizeSpokenText,
  recordedVoiceUrl,
  voiceObjectPath,
} from '../voiceKey';
import { GREETING_TEXT } from '../../../screens/exam/examAnnouncements';

describe('normalizeSpokenText', () => {
  it('turns NBSP and narrow NBSP (French typography before ! ? : ;) into plain spaces', () => {
    expect(normalizeSpokenText('Bonjour\u00A0! Ça va\u202F?')).toBe('Bonjour ! Ça va ?');
  });

  it('collapses runs of spaces, tabs and newlines and trims', () => {
    expect(normalizeSpokenText('  Tu  aimes\tle\n\nsport ?  ')).toBe('Tu aimes le sport ?');
  });

  it('composes NFD into NFC, so a decomposed é keys the same as a precomposed one', () => {
    const nfd = 'prête'.normalize('NFD');
    expect(nfd).not.toBe('prête');
    expect(normalizeSpokenText(nfd)).toBe('prête');
  });

  it('leaves apostrophes and punctuation alone (they change what Azure says)', () => {
    expect(normalizeSpokenText("J'aime l’école…")).toBe("J'aime l’école…");
    expect(normalizeSpokenText("J'aime")).not.toBe(normalizeSpokenText('J’aime'));
  });
});

describe('voiceObjectPath', () => {
  it('pins the key format', async () => {
    // PINNED. The recording script and the app must compute the same path from
    // the same text; changing this vector means every stored MP3 is unused.
    // Only change it together with a VOICE_KEY_VERSION bump (which re-records everything).
    expect(VOICE_KEY_VERSION).toBe('v2');
    expect(await voiceObjectPath('Bonjour ! Comment ça va ? Es-tu prêt ? On va commencer.', 'henri')).toBe(
      'v2/henri/2363d401f53d9816d3b069c74953fd5a.mp3',
    );
  });

  it('keys the exam greeting with the pinned vector (its text has not drifted)', async () => {
    expect(await voiceObjectPath(GREETING_TEXT, 'henri')).toBe('v2/henri/2363d401f53d9816d3b069c74953fd5a.mp3');
  });

  it('keys by normalised text', async () => {
    const a = await voiceObjectPath('Bonjour\u00A0!  ', 'henri');
    expect(await voiceObjectPath('Bonjour !', 'henri')).toBe(a);
    expect(a).toMatch(/^v2\/henri\/[0-9a-f]{32}\.mp3$/);
  });

  it('records Henri only (owner decision)', () => {
    expect(RECORDED_VOICES).toEqual({ henri: 'fr-FR-HenriNeural' });
  });
});

describe('recordedVoiceUrl', () => {
  it('builds the public object URL', () => {
    expect(recordedVoiceUrl('https://abc.supabase.co', 'v2/henri/x.mp3')).toBe(
      `https://abc.supabase.co/storage/v1/object/public/${TTS_BUCKET}/v2/henri/x.mp3`,
    );
    expect(recordedVoiceUrl('https://abc.supabase.co/', 'p.mp3')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/tts-audio/p.mp3',
    );
  });
});

// The backend's port (`backend/lib/voice_key.py`, behind POST /api/native-voice)
// writes AI-corrected sentences to the same paths; both repos check these vectors.
const VECTORS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'backend', 'data', 'tts', 'voice_key_vectors.json');

describe.skipIf(!existsSync(VECTORS))('voice key parity with the backend', () => {
  it('computes every shared vector exactly', async () => {
    const data = JSON.parse(readFileSync(VECTORS, 'utf-8')) as {
      version: string;
      vectors: { text: string; normalized: string; path: string }[];
    };
    expect(data.version).toBe(VOICE_KEY_VERSION);
    expect(data.vectors.length).toBeGreaterThan(5);
    for (const v of data.vectors) {
      expect(normalizeSpokenText(v.text)).toBe(v.normalized);
      expect(await voiceObjectPath(v.text, 'henri')).toBe(v.path);
    }
  });
});
