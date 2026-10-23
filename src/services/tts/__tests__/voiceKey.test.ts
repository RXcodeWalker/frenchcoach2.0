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
    expect(VOICE_KEY_VERSION).toBe('v1');
    expect(await voiceObjectPath('Bonjour ! Comment ça va ? Es-tu prêt ? On va commencer.', 'denise')).toBe(
      'v1/denise/14a452e04f324b324ae489ea08ea04bd.mp3',
    );
  });

  it('keys the exam greeting with the pinned vector (its text has not drifted)', async () => {
    expect(await voiceObjectPath(GREETING_TEXT, 'denise')).toBe('v1/denise/14a452e04f324b324ae489ea08ea04bd.mp3');
  });

  it('keys by normalised text, and separately per voice', async () => {
    const a = await voiceObjectPath('Bonjour\u00A0!  ', 'denise');
    expect(await voiceObjectPath('Bonjour !', 'denise')).toBe(a);
    const henri = await voiceObjectPath('Bonjour !', 'henri');
    expect(henri).not.toBe(a.replace('/denise/', '/henri/'));
    expect(henri).toMatch(/^v1\/henri\/[0-9a-f]{32}\.mp3$/);
  });

  it('has one id per Azure voice', () => {
    expect(RECORDED_VOICES).toEqual({ denise: 'fr-FR-DeniseNeural', henri: 'fr-FR-HenriNeural' });
  });
});

describe('recordedVoiceUrl', () => {
  it('builds the public object URL', () => {
    expect(recordedVoiceUrl('https://abc.supabase.co', 'v1/denise/x.mp3')).toBe(
      `https://abc.supabase.co/storage/v1/object/public/${TTS_BUCKET}/v1/denise/x.mp3`,
    );
    expect(recordedVoiceUrl('https://abc.supabase.co/', 'p.mp3')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/tts-audio/p.mp3',
    );
  });
});
