// @vitest-environment jsdom
// "An English voice never reads French" (junior-track §7, ADR 0012). Driven three ways: the voice with a
// fake browser, the REAL text-to-speech service against a fake speechSynthesis, and a source guard.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { JUNIOR_BANK, allBankLines, requiredAudioIds } from '../../../data/junior';
import { sentenceAudioId } from '../../../data/junior/sentence';
import { createLeoVoice, type AudioLike, type SpeakableLine, type VoiceDeps } from '../leoVoice';

// Everything Léo can be asked to say: each fixed/theme/question line, plus every model sentence.
function everyLine(): SpeakableLine[] {
  const lines: SpeakableLine[] = allBankLines(JUNIOR_BANK).map((l) => ({ fr: l.fr, audioId: l.audioId }));
  for (const q of JUNIOR_BANK.questions) {
    q.frames.forEach((f, i) =>
      f.slotOptions.forEach((o) => lines.push({ fr: f.template.replace('{slot}', o.word), audioId: sentenceAudioId(q.id, i, o.id) })),
    );
  }
  return lines;
}

interface Fake {
  deps: VoiceDeps;
  french: { value: boolean };
  spoken: string[];
  audioUrls: string[];
  audio: { failPlay: boolean; last: FakeAudio | null };
}

class FakeAudio implements AudioLike {
  ended: (() => void) | null = null;
  errored: (() => void) | null = null;
  paused = false;
  constructor(public url: string, private fake: Fake['audio']) {}
  onEnded(cb: (() => void) | null) { this.ended = cb; }
  onError(cb: (() => void) | null) { this.errored = cb; }
  async play() {
    if (this.fake.failPlay) throw new Error('blocked');
    queueMicrotask(() => this.ended?.());
  }
  pause() { this.paused = true; }
}

function fake(files: string[] = [], french = false): Fake {
  const state: Fake = {
    french: { value: french },
    spoken: [],
    audioUrls: [],
    audio: { failPlay: false, last: null },
    deps: null as unknown as VoiceDeps,
  };
  state.deps = {
    files: new Set(files),
    fileUrl: (id) => `/audio/junior/${id}.mp3`,
    createAudio: (url) => {
      state.audioUrls.push(url);
      state.audio.last = new FakeAudio(url, state.audio);
      return state.audio.last;
    },
    tts: {
      hasFrenchVoice: () => state.french.value,
      speak: async (text: string) => { state.spoken.push(text); },
      stop: () => {},
      ensureVoiceReady: async () => {},
    },
  };
  return state;
}

describe('Léo never speaks French in an English voice — with a fake browser', () => {
  it('with no recorded file and no French voice, no line can be spoken and nothing is ever read aloud', async () => {
    const f = fake([], false);
    const voice = createLeoVoice(f.deps);
    for (const line of everyLine()) {
      expect(voice.canSpeak(line)).toBe(false);
      await voice.speak(line);
    }
    await voice.speakAll(everyLine());
    expect(f.spoken).toEqual([]);
    expect(f.audioUrls).toEqual([]);
  });

  it('covers every audio id the bank asks for', () => {
    const ids = new Set(everyLine().map((l) => l.audioId));
    for (const id of requiredAudioIds(JUNIOR_BANK)) expect(ids.has(id)).toBe(true);
  });

  it('with a French voice and no file, the French text is read by that voice', async () => {
    const f = fake([], true);
    const voice = createLeoVoice(f.deps);
    const line = { fr: "J'aime le bleu.", audioId: 'col_01.f0.bleu' };
    expect(voice.canSpeak(line)).toBe(true);
    await voice.speak(line);
    expect(f.spoken).toEqual(["J'aime le bleu."]);
  });

  it('a recorded file is played instead of any voice, even when a French voice exists', async () => {
    const f = fake(['praise.super'], true);
    const voice = createLeoVoice(f.deps);
    await voice.speak({ fr: 'Super !', audioId: 'praise.super' });
    expect(f.audioUrls).toEqual(['/audio/junior/praise.super.mp3']);
    expect(f.spoken).toEqual([]);
  });

  it('a recorded file with no French voice still has a 🔊 (the file plays)', () => {
    const voice = createLeoVoice(fake(['praise.super'], false).deps);
    expect(voice.canSpeak({ fr: 'Super !', audioId: 'praise.super' })).toBe(true);
    expect(voice.canSpeak({ fr: 'Bravo !', audioId: 'praise.bravo' })).toBe(false);
  });

  it('a file that will not play falls back to a French voice only — and to silence without one', async () => {
    const withFrench = fake(['praise.super'], true);
    withFrench.audio.failPlay = true;
    await createLeoVoice(withFrench.deps).speak({ fr: 'Super !', audioId: 'praise.super' });
    expect(withFrench.spoken).toEqual(['Super !']);

    const without = fake(['praise.super'], false);
    without.audio.failPlay = true;
    await createLeoVoice(without.deps).speak({ fr: 'Super !', audioId: 'praise.super' });
    expect(without.spoken).toEqual([]);
  });

  it('re-checks for a French voice at the moment of speaking: a voice that has gone away is not replaced by another', async () => {
    const f = fake([], true);
    const voice = createLeoVoice(f.deps);
    const line = { fr: 'Bravo !', audioId: 'praise.bravo' };
    expect(voice.canSpeak(line)).toBe(true);
    f.french.value = false;
    await voice.speak(line);
    expect(f.spoken).toEqual([]);
  });

  it('speakAll says the lines in order and stop() ends the run', async () => {
    const f = fake([], true);
    const voice = createLeoVoice(f.deps);
    await voice.speakAll([
      { fr: 'Un.', audioId: '' },
      { fr: 'Deux.', audioId: '' },
    ]);
    expect(f.spoken).toEqual(['Un.', 'Deux.']);

    f.spoken.length = 0;
    const slow = fake([], true);
    slow.deps.tts.speak = async (t: string) => { slow.spoken.push(t); voiceRef.stop(); };
    const voiceRef = createLeoVoice(slow.deps);
    await voiceRef.speakAll([{ fr: 'Un.', audioId: '' }, { fr: 'Deux.', audioId: '' }, { fr: 'Trois.', audioId: '' }]);
    expect(slow.spoken).toEqual(['Un.']);
  });

  it('stop() pauses a playing recording', async () => {
    const f = fake(['praise.super'], false);
    const voice = createLeoVoice(f.deps);
    f.audio.failPlay = false;
    const pending = voice.speak({ fr: 'Super !', audioId: 'praise.super' });
    voice.stop();
    await pending;
    expect(f.audio.last?.paused).toBe(true);
  });
});

// ── The real TTS service against a fake speechSynthesis ──────────────────────────────────────────

interface FakeVoice { name: string; lang: string; localService: boolean }
const EN: FakeVoice[] = [
  { name: 'Alex', lang: 'en-US', localService: true },
  { name: 'Daniel', lang: 'en-GB', localService: true },
];
const FR: FakeVoice = { name: 'Thomas', lang: 'fr-FR', localService: true };

describe('Léo never speaks French in an English voice — the real TTS service', () => {
  const utterances: Array<{ text: string; lang: string; voice: FakeVoice | null }> = [];

  function install(voices: FakeVoice[]) {
    utterances.length = 0;
    class FakeUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: FakeVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      constructor(public text: string) {}
    }
    const synth = {
      speaking: false,
      pending: false,
      getVoices: () => voices,
      addEventListener: () => {},
      removeEventListener: () => {},
      cancel: () => {},
      speak: vi.fn((u: FakeUtterance) => {
        utterances.push({ text: u.text, lang: u.lang, voice: u.voice });
        queueMicrotask(() => u.onend?.());
      }),
    };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    return synth;
  }

  async function voiceWith(voices: FakeVoice[]) {
    const synth = install(voices);
    vi.resetModules();
    const { createLeoVoice: create } = await import('../leoVoice');
    const { TTS } = await import('../../../services/tts/ttsService');
    const { JUNIOR_AUDIO_FILES, audioUrl } = await import('../../../data/junior');
    const voice = create({ files: JUNIOR_AUDIO_FILES, fileUrl: audioUrl, createAudio: () => { throw new Error('no audio'); }, tts: TTS });
    return { synth, voice };
  }

  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.unstubAllGlobals());

  it('a browser with only English voices: not one line is spoken, speechSynthesis.speak is never called', async () => {
    const { synth, voice } = await voiceWith(EN);
    for (const line of everyLine()) {
      expect(voice.canSpeak(line)).toBe(false);
      await voice.speak(line);
    }
    await voice.speakAll(everyLine());
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('a browser with no voices at all behaves the same', async () => {
    const { synth, voice } = await voiceWith([]);
    await voice.speakAll(everyLine().slice(0, 20));
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('with a French voice among English ones, every line is read by the French voice, as fr-FR', async () => {
    const { synth, voice } = await voiceWith([...EN, FR]);
    const lines = everyLine().slice(0, 60);
    for (const line of lines) {
      expect(voice.canSpeak(line)).toBe(true);
      await voice.speak(line);
    }
    expect(synth.speak).toHaveBeenCalledTimes(lines.length);
    expect(utterances.every((u) => u.voice === FR && u.lang === 'fr-FR')).toBe(true);
    expect(utterances.some((u) => u.voice && u.voice.lang.startsWith('en'))).toBe(false);
  });

  it('prefers any French voice over an English one regardless of list order', async () => {
    const { voice } = await voiceWith([EN[0], { name: 'Amélie', lang: 'fr-CA', localService: false }, EN[1]]);
    await voice.speak({ fr: 'Bonjour !', audioId: '' });
    expect(utterances[0].voice?.lang).toBe('fr-CA');
  });
});

// ── Source guard ─────────────────────────────────────────────────────────────────────────────────

describe('only leoVoice.ts may touch speech synthesis', () => {
  const ROOT = join(__dirname, '../../../..');
  function walk(dir: string): string[] {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) return [];
    return readdirSync(abs).flatMap((n) => {
      const p = join(dir, n);
      if (statSync(join(ROOT, p)).isDirectory()) return n === '__tests__' ? [] : walk(p);
      return /\.tsx?$/.test(n) ? [p] : [];
    });
  }
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const files = ['src/features/junior', 'src/screens/junior', 'src/domain/junior', 'src/data/junior'].flatMap(walk);

  it('no other Junior file uses speechSynthesis, SpeechSynthesisUtterance or the TTS service', () => {
    const offenders = files.filter((f) => f !== 'src/features/junior/leoVoice.ts' && /speechSynthesis|SpeechSynthesisUtterance|ttsService|\bTTS\b/.test(strip(readFileSync(join(ROOT, f), 'utf8'))));
    expect(offenders).toEqual([]);
  });

  it('leoVoice.ts reaches speech synthesis only through the TTS service, and reads French text only behind a French-voice check', () => {
    const code = strip(readFileSync(join(ROOT, 'src/features/junior/leoVoice.ts'), 'utf8'));
    expect(code).not.toMatch(/SpeechSynthesisUtterance|speechSynthesis\.speak/);
    // The only call that reads text aloud sits after a hasFrenchVoice() guard.
    const at = code.indexOf('deps.tts.speak(');
    expect(at).toBeGreaterThan(0);
    expect(code.slice(0, at)).toMatch(/hasFrenchVoice\(\)\) return;\s*try\s*\{\s*await\s*$/);
  });
});
