import { fillerRetention, isHallucination, percentile, wordErrorRate } from './metrics';
import { CHROME_CONFIG, CONFIGS, type Clip, type DecisionRule, type Manifest, type ResultsFile } from './types';

export interface ConfigSummary {
  config: string;
  /** Sum of errors / sum of reference words over every clip that has speech. */
  wer: number;
  /** Same, accent clips only (null when none). */
  accentWer: number | null;
  hallucinations: number;
  hallucinatedClips: string[];
  /** Mean filler retention over dual-reference clips that contain fillers (null if none). */
  fillerRetention: number | null;
  /** WER against the intended-clean reference, dual-reference clips only (null if none). */
  cleanWer: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  errors: number;
}

export interface Verdict {
  adoptWhisper: boolean;
  /** The best-WER Whisper config that passes, if any. */
  whisperConfig: string | null;
  useLargeV3: boolean;
  reasons: string[];
}

export interface Report {
  summaries: ConfigSummary[];
  verdict: Verdict;
}

function aggregate(pairs: { errors: number; refLength: number }[]): number | null {
  const refs = pairs.reduce((a, p) => a + p.refLength, 0);
  if (refs === 0) return null;
  return pairs.reduce((a, p) => a + p.errors, 0) / refs;
}

const hasSpeech = (c: Clip) => c.kind !== 'silence' && c.reference.trim() !== '';

export function summariseConfig(config: string, manifest: Manifest, file: ResultsFile): ConfigSummary {
  const textFor = (clip: Clip): { text: string; latencies: number[]; error?: string } => {
    if (config === CHROME_CONFIG) return { text: clip.chromeText, latencies: [] };
    const r = file.results.find((x) => x.clipId === clip.id && x.config === config);
    return { text: r?.text ?? '', latencies: r?.latenciesMs ?? [], error: r ? r.error : 'missing' };
  };

  const all: { errors: number; refLength: number }[] = [];
  const accent: { errors: number; refLength: number }[] = [];
  const clean: { errors: number; refLength: number }[] = [];
  const retentions: number[] = [];
  const latencies: number[] = [];
  const hallucinatedClips: string[] = [];
  let errors = 0;

  for (const clip of manifest.clips) {
    const got = textFor(clip);
    if (got.error) errors++;
    latencies.push(...got.latencies);
    if (isHallucination(clip.kind, got.text)) hallucinatedClips.push(clip.id);
    if (!hasSpeech(clip)) continue;
    const w = wordErrorRate(clip.reference, got.text);
    all.push(w);
    if (clip.accent) accent.push(w);
    if (clip.referenceClean !== undefined) {
      clean.push(wordErrorRate(clip.referenceClean, got.text));
      const kept = fillerRetention(clip.reference, got.text);
      if (kept !== null) retentions.push(kept);
    }
  }

  return {
    config,
    wer: aggregate(all) ?? NaN,
    accentWer: aggregate(accent),
    hallucinations: hallucinatedClips.length,
    hallucinatedClips,
    fillerRetention: retentions.length ? retentions.reduce((a, b) => a + b, 0) / retentions.length : null,
    cleanWer: aggregate(clean),
    p50Ms: latencies.length ? percentile(latencies, 50) : null,
    p95Ms: latencies.length ? percentile(latencies, 95) : null,
    errors,
  };
}

/** Applies the pre-declared rule. Throws if the rule still has unset (null) numbers. */
export function decide(summaries: ConfigSummary[], rule: DecisionRule): Verdict {
  if (
    rule.minWerImprovementOverChrome === null ||
    rule.minAccentMarginForLargeV3 === null ||
    rule.maxP95LatencyMs === null
  ) {
    throw new Error('decision-rule.json has unset (null) thresholds: declare them before running the benchmark.');
  }
  const chrome = summaries.find((s) => s.config === CHROME_CONFIG);
  if (!chrome) throw new Error('No chrome baseline in results.');
  const reasons: string[] = [];

  const whisper = summaries.filter((s) => s.config !== CHROME_CONFIG);
  const passing = whisper.filter((s) => {
    if (s.errors > 0) {
      reasons.push(`${s.config}: ${s.errors} request error(s), not adoptable until re-run clean`);
      return false;
    }
    if (s.hallucinations > rule.maxHallucinations) {
      reasons.push(`${s.config}: ${s.hallucinations} hallucinated output(s) (${s.hallucinatedClips.join(', ')})`);
      return false;
    }
    if (!(chrome.wer - s.wer >= rule.minWerImprovementOverChrome!)) {
      reasons.push(`${s.config}: WER ${pct(s.wer)} does not beat chrome ${pct(chrome.wer)} by ${pct(rule.minWerImprovementOverChrome!)}`);
      return false;
    }
    return true;
  });

  if (passing.length === 0) {
    reasons.push('No Whisper config passed: keep Chrome text (abandon the refine path).');
    return { adoptWhisper: false, whisperConfig: null, useLargeV3: false, reasons };
  }

  // Best passing turbo config vs best passing large-v3 config.
  const best = (model: string) =>
    passing
      .filter((s) => CONFIGS.find((c) => c.id === s.config)?.model === model)
      .sort((a, b) => a.wer - b.wer)[0];
  const turbo = best('whisper-large-v3-turbo');
  const large = best('whisper-large-v3');

  let chosen = turbo ?? large;
  let useLargeV3 = !turbo && !!large;
  if (turbo && large) {
    const margin = (turbo.accentWer ?? NaN) - (large.accentWer ?? NaN);
    const fits = (large.p95Ms ?? Infinity) <= rule.maxP95LatencyMs!;
    if (margin >= rule.minAccentMarginForLargeV3! && fits) {
      chosen = large;
      useLargeV3 = true;
      reasons.push(`large-v3 chosen: accent WER better by ${pct(margin)}, p95 ${large.p95Ms}ms within budget`);
    } else {
      reasons.push(
        `turbo kept over large-v3: accent margin ${Number.isNaN(margin) ? 'n/a' : pct(margin)} (need ${pct(rule.minAccentMarginForLargeV3!)}), large-v3 p95 ${large.p95Ms ?? 'n/a'}ms (budget ${rule.maxP95LatencyMs}ms)`,
      );
    }
  }
  return { adoptWhisper: true, whisperConfig: chosen!.config, useLargeV3, reasons };
}

const pct = (x: number | null) => (x === null || Number.isNaN(x) ? 'n/a' : `${(x * 100).toFixed(1)}%`);
const ms = (x: number | null) => (x === null ? 'n/a' : `${Math.round(x)}`);

export function buildReport(manifest: Manifest, file: ResultsFile, rule: DecisionRule): Report {
  const configs = [CHROME_CONFIG, ...Array.from(new Set(file.results.map((r) => r.config)))];
  const summaries = configs.map((c) => summariseConfig(c, manifest, file));
  return { summaries, verdict: decide(summaries, rule) };
}

export function formatReport(report: Report): string {
  const rows = report.summaries.map((s) =>
    [
      s.config,
      pct(s.wer),
      pct(s.accentWer),
      String(s.hallucinations),
      pct(s.fillerRetention),
      pct(s.cleanWer),
      ms(s.p50Ms),
      ms(s.p95Ms),
      String(s.errors),
    ].join(' | '),
  );
  const v = report.verdict;
  return [
    '| config | WER | accent WER | hallucinations | filler retention | WER vs clean ref | p50 ms | p95 ms | request errors |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r} |`),
    '',
    `Adopt Whisper: ${v.adoptWhisper ? `YES (${v.whisperConfig}${v.useLargeV3 ? ', large-v3' : ''})` : 'NO'}`,
    ...v.reasons.map((r) => `- ${r}`),
    '',
  ].join('\n');
}
