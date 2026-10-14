/**
 * Léo's voice (junior-track §7): pre-recorded audio first; the browser's text-to-
 * speech only as a fallback, and ONLY when it has a French voice. An English voice
 * never reads French — where neither a recorded file nor a French voice exists,
 * the line simply has no 🔊 (`canSpeak` is false and `speak` does nothing).
 *
 * The decision itself is `domain/junior/voice.ts`'s `resolveVoice`; this file is
 * the I/O around it. It is the ONLY Junior file allowed to touch speech synthesis
 * (guarded by `leoVoice.neverEnglish.test.ts`). `createLeoVoice` takes its
 * dependencies so that test can drive it with a fake browser; `useLeoVoice` is the
 * one real instance the screens share.
 */
import { useEffect, useState } from 'react';
import { JUNIOR_AUDIO_FILES, audioUrl } from '../../data/junior';
import { resolveVoice } from '../../domain/junior/voice';
import { TTS } from '../../services/tts/ttsService';

export interface SpeakableLine {
  fr: string;
  /** Id of the pre-recorded file (data/junior). Empty when the line has none (it can still be read by a French voice). */
  audioId: string;
}

export interface LeoVoice {
  /** True when a recorded file or a French voice can say this line. Drives whether a 🔊 shows. */
  canSpeak(line: SpeakableLine): boolean;
  /** Plays the line; resolves when it ends. Resolves immediately when it cannot be spoken. Never rejects. */
  speak(line: SpeakableLine): Promise<void>;
  /** Plays the lines one after the other (a `stop()` in between ends the run). */
  speakAll(lines: readonly SpeakableLine[]): Promise<void>;
  stop(): void;
}

/** The slice of an `HTMLAudioElement` the voice uses. */
export interface AudioLike {
  onEnded(cb: (() => void) | null): void;
  onError(cb: (() => void) | null): void;
  play(): Promise<void>;
  pause(): void;
}

export interface VoiceDeps {
  /** Ids with a recorded file. */
  files: ReadonlySet<string>;
  fileUrl: (audioId: string) => string;
  createAudio: (url: string) => AudioLike;
  /** The shared TTS service; `hasFrenchVoice` is true only for a real fr-* voice. */
  tts: Pick<typeof TTS, 'hasFrenchVoice' | 'speak' | 'stop' | 'ensureVoiceReady'>;
}

export function createLeoVoice(deps: VoiceDeps): LeoVoice {
  let audio: AudioLike | null = null;
  /** Settles the file being played (as "did not finish") when it is cut off. */
  let cutOff: (() => void) | null = null;
  /** Bumped whenever the current sound is cut off, by a new line or by `stop()`. */
  let epoch = 0;
  /** Bumped by `stop()` only: ends a `speakAll` run. */
  let stopEpoch = 0;

  const sourceOf = (line: SpeakableLine) =>
    resolveVoice({ hasFile: line.audioId !== '' && deps.files.has(line.audioId), hasFrenchVoice: deps.tts.hasFrenchVoice() });

  function halt() {
    epoch += 1;
    const a = audio;
    const settle = cutOff;
    audio = null;
    cutOff = null;
    if (a) {
      a.onEnded(null);
      a.onError(null);
      a.pause();
    }
    settle?.();
    deps.tts.stop();
  }

  function playFile(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      let a: AudioLike;
      try {
        a = deps.createAudio(url);
      } catch {
        resolve(false);
        return;
      }
      audio = a;
      cutOff = () => resolve(false);
      a.onEnded(() => resolve(true));
      a.onError(() => resolve(false));
      a.play().catch(() => resolve(false));
    });
  }

  async function speakFrench(text: string): Promise<void> {
    // Re-checked at the moment of speaking: the voice list can change under us.
    if (!deps.tts.hasFrenchVoice()) return;
    try {
      await deps.tts.speak(text);
    } catch {
      // A speech engine error is silence, never an English fallback.
    }
  }

  async function speak(line: SpeakableLine): Promise<void> {
    const source = sourceOf(line);
    if (source === 'none') return;
    halt();
    const mine = epoch;
    if (source === 'file') {
      const played = await playFile(deps.fileUrl(line.audioId));
      if (mine === epoch) {
        audio = null;
        cutOff = null;
      }
      if (played || mine !== epoch) return;
      // The file would not play (missing, or autoplay blocked): a French voice may still say it, nothing else.
    }
    await speakFrench(line.fr);
  }

  return {
    canSpeak: (line) => sourceOf(line) !== 'none',
    speak,
    async speakAll(lines) {
      const startedStop = stopEpoch;
      let last: number | null = null;
      for (const line of lines) {
        if (stopEpoch !== startedStop || (last !== null && epoch !== last)) return;
        await speak(line);
        last = epoch;
      }
    },
    stop() {
      stopEpoch += 1;
      halt();
    },
  };
}

let shared: LeoVoice | null = null;

function sharedVoice(): LeoVoice {
  shared ??= createLeoVoice({
    files: JUNIOR_AUDIO_FILES,
    fileUrl: audioUrl,
    createAudio: (url) => {
      const el = new Audio(url);
      return {
        onEnded: (cb) => { el.onended = cb ? () => cb() : null; },
        onError: (cb) => { el.onerror = cb ? () => cb() : null; },
        play: () => el.play(),
        pause: () => el.pause(),
      };
    },
    tts: TTS,
  });
  return shared;
}

/**
 * The one shared voice. The component re-renders once the browser's voice list has
 * loaded (or changed), so a 🔊 that depends on a French voice appears when — and only
 * when — that voice is really there.
 */
export function useLeoVoice(): LeoVoice {
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!TTS.isSupported()) return;
    let live = true;
    void TTS.ensureVoiceReady().then(() => live && refresh((n) => n + 1));
    const onChange = () => refresh((n) => n + 1);
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    return () => {
      live = false;
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
    };
  }, []);
  return sharedVoice();
}
