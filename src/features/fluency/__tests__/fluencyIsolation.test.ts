/**
 * fluency-trainer §5: the trainer makes no AI call, spends no quota, writes no
 * app state and sends no analytics. Its one write is its own local drill record.
 * UI rules (Design System v2): no text under 12px, no glow, gradients, hover
 * motion, looping pulses, raw colours or inline hex.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const TRAINER = [
  ...walk(join(SRC, 'features/fluency')),
  join(SRC, 'domain/fluency/flowMeasures.ts'),
  join(SRC, 'domain/fluency/drill432.ts'),
  join(SRC, 'domain/fluency/fluencyProfile.ts'),
  join(SRC, 'services/fluency/drillStore.ts'),
  join(SRC, 'screens/Fluency.tsx'),
  join(SRC, 'screens/FluencyDrill.tsx'),
];
const sources = TRAINER.map((f) => [f.slice(SRC.length + 1), strip(readFileSync(f, 'utf8'))] as const);

const BANNED_IMPORTS: Array<[string, RegExp]> = [
  ['app state', /context\/AppContext|useApp\b|type: '[A-Z_]+'/],
  ['XP or rewards', /computeXPGain|dispatchAddXP|ADD_XP|ADD_SESSION|completeMinigameSession|progressionService|awardXP/],
  ['the session orchestrator', /orchestrateAttempt|sessionOrchestrator/],
  ['an AI or backend call', /apiClient|getAIFeedback|transcribeAudio|transcribeLearnAnswer|assessPronunciation|fetch\(/],
  ['analytics or telemetry', /services\/telemetry|\btrack\(|posthog/i],
  ['sync or Supabase', /services\/sync|lib\/supabase|supabase\./],
  ['the learner model or coach', /learnerModel|services\/coach/],
  ['the scored pipeline', /domain\/igcse|domain\/examFeedback/],
];

const DESIGN: Array<[string, RegExp]> = [
  ['text under 12px', /text-\[(?:\d|1[01])(?:\.\d+)?px\]/],
  ['hover motion', /whileHover|hover:scale/],
  ['looping pulse', /animate-(?:pulse|ping|bounce|spin)/],
  ['gradient', /bg-gradient-/],
  ['glow', /shadow-\[[^\]]*rgba/],
  ['raw colour', /\b(?:text|bg|border|fill|stroke)-(?:slate|gray|zinc|red|green|blue|amber|yellow|emerald|violet|purple|indigo)-\d{2,3}\b/],
  ['inline hex', /#[0-9a-fA-F]{3,8}\b/],
  ['white text', /text-white/],
];

describe('fluency trainer isolation', () => {
  it('scans the trainer', () => {
    expect(sources.some(([f]) => f.endsWith('DrillRunner.tsx'))).toBe(true);
  });

  it.each(BANNED_IMPORTS)('never reaches %s', (_label, re) => {
    expect(sources.filter(([, s]) => re.test(s)).map(([f]) => f)).toEqual([]);
  });

  it.each(DESIGN)('UI has no %s', (_label, re) => {
    expect(sources.filter(([f, s]) => f.endsWith('.tsx') && re.test(s)).map(([f]) => f)).toEqual([]);
  });

  it('every recording goes through useRecording behind the consent gate', () => {
    const runner = sources.find(([f]) => f.endsWith('DrillRunner.tsx'))![1];
    expect(runner).toMatch(/useRecording\(blocked\)/);
    expect(runner).toMatch(/<SpeakingConsentGate>/);
    expect(runner).toMatch(/consentStatus === 'pending'/);
  });

  it('nothing in the scored pipeline or Junior imports the trainer', () => {
    const dirs = ['domain/igcse', 'domain/junior', 'features/junior'].map((d) => join(SRC, d));
    const offenders = dirs.flatMap(walk).filter((f) => /fluency\/(?:drill432|flowMeasures|fluencyProfile)|features\/fluency|drillStore/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
