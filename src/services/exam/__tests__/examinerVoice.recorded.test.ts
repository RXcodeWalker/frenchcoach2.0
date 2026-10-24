// The examiner's recorded voice (recorded-voices plan §6.3, §6.5): turn-taking, stop/generation races,
// mute, and the French-only fallback. Fake speechSynthesis + fake Audio, real modules.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeAudio, settle, until } from '../../tts/__tests__/fakeAudio';

interface FakeVoice { name: string; lang: string; localService: boolean }
const FR: FakeVoice = { name: 'Thomas', lang: 'fr-FR', localService: true };
const EN: FakeVoice = { name: 'Alex', lang: 'en-US', localService: true };

type Voice = typeof import('../examinerVoice');
let spoken: string[];
let synthSpeak: ReturnType<typeof vi.fn>;

async function load(voices: FakeVoice[], flag: '1' | '0' = '1'): Promise<Voice> {
  vi.stubEnv('VITE_RECORDED_VOICES', flag);
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  spoken = [];
  class FakeUtterance {
    lang = '';
    rate = 1;
    volume = 1;
    voice: unknown = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  }
  synthSpeak = vi.fn((u: FakeUtterance) => {
    if (u.volume !== 0) spoken.push(u.text);
    queueMicrotask(() => u.onend?.());
  });
  const synthesis = {
    getVoices: () => voices,
    speak: synthSpeak,
    cancel: () => {},
    resume: () => {},
    onvoiceschanged: null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vi.stubGlobal('window', { speechSynthesis: synthesis });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.resetModules();
  return import('../examinerVoice');
}

const recordings = () => (FakeAudio.shared?.plays ?? []).filter((s) => !s.startsWith('data:'));
async function playingCount(n: number): Promise<FakeAudio> {
  await until(() => recordings().length >= n, `${n} recording(s)`);
  return FakeAudio.shared!;
}
function track(p: Promise<void>) {
  const state = { done: false };
  void p.then(() => (state.done = true));
  return state;
}

beforeEach(() => {
  FakeAudio.reset();
  vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('examiner recorded voice', () => {
  it('resolves only when the recording ends, so the mic never opens mid-line', async () => {
    const v = await load([FR]);
    const line = track(v.speakExaminerText('Bonjour.', undefined, { recorded: true }));
    const audio = await playingCount(1);
    audio.emit('playing');
    await settle();
    expect(line.done).toBe(false);
    audio.emit('ended');
    await until(() => line.done, 'line to resolve');
    expect(synthSpeak).not.toHaveBeenCalled();
  });

  it('stopExaminerVoice() during a recording resolves it, and nothing plays afterwards', async () => {
    const v = await load([FR]);
    const line = track(v.speakExaminerText('Première.', undefined, { recorded: true }));
    const queued = track(v.speakExaminerText('Deuxième.', undefined, { recorded: true }));
    const audio = await playingCount(1);
    audio.emit('playing');
    v.stopExaminerVoice();
    await until(() => line.done && queued.done, 'both lines to resolve');
    expect(audio.paused).toBe(true);
    await settle();
    expect(recordings()).toHaveLength(1);
    expect(synthSpeak).not.toHaveBeenCalled();
  });

  it('a stale generation never plays and never falls through to the browser voice', async () => {
    const v = await load([FR]);
    const gen = v.getExaminerVoiceGeneration();
    v.stopExaminerVoice();
    await v.speakExaminerText('Bonjour.', gen, { recorded: true });
    await settle();
    expect(FakeAudio.instances).toHaveLength(0);
    expect(synthSpeak).not.toHaveBeenCalled();
  });

  it('a line queued under a generation that is then stopped is dropped, even with a French voice', async () => {
    const v = await load([FR]);
    const gen = v.getExaminerVoiceGeneration();
    const first = track(v.speakExaminerText('Un.', gen, { recorded: true }));
    const second = track(v.speakExaminerText('Deux.', gen, { recorded: true }));
    await playingCount(1);
    v.stopExaminerVoice();
    await until(() => first.done && second.done, 'both lines');
    await settle();
    expect(recordings()).toHaveLength(1);
    expect(synthSpeak).not.toHaveBeenCalled();
  });

  it('muted: the audio element is never touched', async () => {
    const v = await load([FR]);
    v.setExaminerVoiceMuted(true);
    await v.speakExaminerText('Bonjour.', undefined, { recorded: true });
    await v.speakExaminerText('Bonjour.', v.getExaminerVoiceGeneration(), { recorded: true });
    expect(FakeAudio.instances).toHaveLength(0);
    expect(synthSpeak).not.toHaveBeenCalled();
  });

  it('muting mid-recording stops it and never falls back', async () => {
    const v = await load([FR]);
    const line = track(v.speakExaminerText('Bonjour.', undefined, { recorded: true }));
    const audio = await playingCount(1);
    audio.emit('playing');
    v.setExaminerVoiceMuted(true);
    await until(() => line.done, 'line');
    expect(audio.paused).toBe(true);
    expect(synthSpeak).not.toHaveBeenCalled();
  });

  it('a missing recording falls back to a French browser voice…', async () => {
    const v = await load([EN, FR]);
    const line = track(v.speakExaminerText('Ligne absente.', undefined, { recorded: true }));
    (await playingCount(1)).emit('error');
    await until(() => line.done, 'line');
    expect(spoken).toEqual(['Ligne absente.']);
  });

  it('…and to silence when the only voice is English', async () => {
    const v = await load([EN]);
    const line = track(v.speakExaminerText('Ligne absente.', undefined, { recorded: true }));
    (await playingCount(1)).emit('error');
    await until(() => line.done, 'line');
    await settle();
    expect(synthSpeak).not.toHaveBeenCalled();
  });

  it('a replay tapped mid-line waits for the line instead of cutting it off', async () => {
    const v = await load([FR]);
    const line = track(v.speakExaminerText('Question.', undefined, { recorded: true }));
    const audio = await playingCount(1);
    audio.emit('playing');
    const replay = track(v.speakExaminerText('Question.', v.getExaminerVoiceGeneration(), { recorded: true }));
    await settle();
    expect(audio.paused).toBe(false);
    expect(recordings()).toHaveLength(1);
    expect(line.done).toBe(false);

    audio.emit('ended');
    await until(() => line.done, 'line');
    await playingCount(2);
    audio.emit('playing');
    audio.emit('ended');
    await until(() => replay.done, 'replay');
  });

  it('primeExaminerVoice() also unlocks the recording element, once', async () => {
    const v = await load([FR]);
    v.primeExaminerVoice();
    v.primeExaminerVoice();
    expect(FakeAudio.shared?.plays).toHaveLength(1);
    expect(FakeAudio.shared?.plays[0]).toMatch(/^data:audio\/mpeg/);
  });

  it('flag off: { recorded: true } is today\'s browser path and the audio element is never created', async () => {
    const v = await load([FR], '0');
    v.primeExaminerVoice();
    await v.speakExaminerText('Bonjour.', undefined, { recorded: true });
    expect(spoken).toEqual(['Bonjour.']);
    expect(FakeAudio.instances).toHaveLength(0);
  });
});
