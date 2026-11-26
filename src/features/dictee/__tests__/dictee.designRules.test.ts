/**
 * Dictée UI rules (Design System v2), the same ones Sentence Rebuilder is held
 * to: no text under 12px, only the named motions (no hover scale, looping
 * pulses, glows, gradients or confetti), colour only from role tokens, and no
 * emoji as chrome. Dictée is also a *listening* game, so one more: nothing may
 * play a sound of its own over the line being dictated (cues come only from the
 * shared sound service, after an answer).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FEATURE = join(__dirname, '..');
const SCREEN = join(__dirname, '..', '..', '..', 'screens', 'Dictee.tsx');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

const sources = [...files(FEATURE), SCREEN].map(f => [f, readFileSync(f, 'utf8')] as const);
const ui = sources.filter(([f]) => f.endsWith('.tsx'));

const BANNED: Array<[string, RegExp]> = [
  ['text under 12px', /text-\[(?:\d|1[01])(?:\.\d+)?px\]/],
  ['hover motion', /whileHover|hover:scale/],
  ['looping animation', /animate-(?:pulse|ping|bounce|spin)|repeat:\s*Infinity|repeatType/],
  ['gradient', /bg-gradient-|radial-gradient|linear-gradient/],
  ['glow or blur', /shadow-\[[^\]]*rgba|drop-shadow|backdrop-blur|\bblur-/],
  ['confetti', /confetti/i],
  ['raw colour classes', /\b(?:text|bg|border)-(?:slate|red|emerald|amber|cyan|violet|lime|orange|pink|sky|blue|green|white|black)(?:-\d{2,3})?\b/],
  ['inline hex colour', /#[0-9a-fA-F]{6}\b|rgba?\(/],
  ['an emoji', /\p{Extended_Pictographic}/u],
  ['a shake or rotate', /rotate:\s*\[|x:\s*\[/],
  ['italic or tight tracking', /\bitalic\b|tracking-tighter/],
];

describe('Dictée design rules', () => {
  it('scans the whole feature and the screen', () => {
    expect(ui.some(([f]) => f.endsWith('PlayView.tsx'))).toBe(true);
    expect(ui.some(([f]) => f.endsWith('Dictee.tsx'))).toBe(true);
  });

  it.each(BANNED)('no %s', (_label, re) => {
    expect(ui.filter(([, text]) => re.test(text)).map(([f]) => f)).toEqual([]);
  });

  it('makes no sound of its own: no Audio element, no Web Audio, no mic', () => {
    for (const [f, text] of sources) {
      expect(text, f).not.toMatch(/new Audio\(|AudioContext|getUserMedia|SpeechRecognition|useRecording|MediaRecorder/);
    }
  });

  it('turns off everything that would fix the spelling being tested', () => {
    const box = readFileSync(join(FEATURE, 'AnswerBox.tsx'), 'utf8');
    expect(box).toContain('spellCheck: false');
    expect(box).toContain("autoCorrect: 'off'");
    expect(box).toContain("autoCapitalize: 'none'");
    expect(box).toContain("autoComplete: 'off'");
    expect(box).toContain("lang: 'fr'");
  });
});
