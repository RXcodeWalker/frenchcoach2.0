import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The structural promises behind the sound effects. Each one is what stops a
 * chime from landing in a transcript, hinting at an exam mark, or reaching a
 * surface that must stay silent. Breaking one is a decision, not an accident.
 */
const SRC = resolve(__dirname, '../../..');
const ROOT = resolve(SRC, '..');
const read = (p: string) => readFileSync(p, 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('sound effects wiring', () => {
  it('the sound service is stateless: it imports no app state, store or service', () => {
    for (const file of walk(join(SRC, 'services/sound'))) {
      const imports = [...read(file).matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const spec of imports) {
        expect(spec, `${file} imports ${spec}`).toMatch(/^(\.\/|react$)/);
      }
    }
  });

  it('every recorder holds sound off while its mic is open', () => {
    for (const file of ['features/recording/useRecording.ts', 'features/recording/useAudioBlobRecorder.ts']) {
      expect(read(join(SRC, file)), file).toContain('useMicSilence(isRecording)');
    }
  });

  it('the exam routes are silent', () => {
    const app = read(join(SRC, 'App.tsx'));
    const exam = app.slice(app.indexOf('function ExamLayout'));
    expect(exam.slice(0, exam.indexOf('\n}\n'))).toContain('useSfxSilence()');
  });

  it('the Profile setting feeds the service through SfxBridge, mounted once in AppShell', () => {
    expect(read(join(SRC, 'App.tsx'))).toContain('<SfxBridge />');
    expect(read(join(SRC, 'components/SfxBridge.tsx'))).toContain('setSfxEnabled(state.soundEnabled)');
  });

  it.each([
    ['src/domain', join(SRC, 'domain')],
    ['src/features/junior', join(SRC, 'features/junior')],
    ['src/screens/junior', join(SRC, 'screens/junior')],
    ['scripts/scoring', join(ROOT, 'scripts/scoring')],
    ['server', join(ROOT, 'server')],
  ])('%s never touches the sound service (scored pipeline, Junior track)', (_label, dir) => {
    for (const file of walk(dir)) {
      expect(read(file), file).not.toMatch(/services\/sound|playSfx|useSfx/);
    }
  });

  it('the neutral cues stay neutral: they take no result or score', () => {
    // `ready` and `complete` are played from Learn screens that also show Examiner-voice feedback
    // (docs/decisions/0005); they must never be chosen by a mark.
    const feedback = read(join(SRC, 'features/feedback/FeedbackExperience.tsx'));
    expect(feedback).toMatch(/playSfx\('ready'\)/);
    const summary = read(join(SRC, 'screens/learn/SessionSummary.tsx'));
    expect(summary).toMatch(/useSfxOnChange\('complete', true/);
  });

  it('the shared minigame shell and Micro Drill carry the cues', () => {
    for (const file of [
      'features/minigames/components/GameFeedbackOverlay.tsx',
      'features/minigames/components/GameResultsCard.tsx',
      'components/ui/MicroDrillModal.tsx',
    ]) {
      expect(read(join(SRC, file)), file).toContain('useSfxOnChange(');
    }
  });

  it('flashcards tick once on reveal and are silent while browsing', () => {
    const deck = read(join(SRC, 'components/ui/FlashcardDeck.tsx'));
    expect(deck.match(/playSfx\(/g)).toHaveLength(1);
    expect(deck).toContain("playSfx('stop')");
  });

  it('Speed Speaking and Speaking Arena keep the mic open all round, so they make no sound during play', () => {
    // A cue from the speakers would reach the live recogniser and could be matched as an answer.
    // They get one cue, at the end, from the shared results card (the mic is closed by then).
    for (const file of ['screens/SpeedSpeaking.tsx', 'screens/SpeakingArena.tsx']) {
      expect(read(join(SRC, file)), file).not.toMatch(/playSfx|useSfxOnChange|services\/sound/);
    }
  });
});
