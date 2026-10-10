export type ClipKind = 'normal' | 'silence' | 'offtopic' | 'grammar-error';

export interface Clip {
  id: string;
  kind: ClipKind;
  /** Audio file name, relative to the data directory. */
  file: string;
  /** Chrome SpeechRecognition final text captured at record time (the baseline). */
  chromeText: string;
  /** Typed verbatim reference: what was actually said, fillers and false starts included. */
  reference: string;
  /** Typed intended-clean reference. Present on the dual-reference clips only. */
  referenceClean?: string;
  /** Vocabulary hint passed as Whisper `prompt` for the "+prompt" configs. */
  promptHint?: string;
  /** Speech the benchmark should weigh for accent robustness (large-v3 margin rule). */
  accent?: boolean;
}

export interface Manifest {
  clips: Clip[];
}

export interface ConfigDef {
  id: string;
  model: string;
  usePrompt: boolean;
}

export const CONFIGS: ConfigDef[] = [
  { id: 'turbo', model: 'whisper-large-v3-turbo', usePrompt: false },
  { id: 'turbo+prompt', model: 'whisper-large-v3-turbo', usePrompt: true },
  { id: 'large-v3', model: 'whisper-large-v3', usePrompt: false },
  { id: 'large-v3+prompt', model: 'whisper-large-v3', usePrompt: true },
];

/** The browser baseline; has no latency (captured live, not a request). */
export const CHROME_CONFIG = 'chrome';

export interface RunResult {
  clipId: string;
  config: string;
  text: string;
  /** Latency of each request made for this clip/config (ms); empty for chrome. */
  latenciesMs: number[];
  error?: string;
}

export interface ResultsFile {
  /** sha256 of decision-rule.json at run time; score refuses a rule edited after the run. */
  ruleHash: string;
  ranAt: string;
  results: RunResult[];
}

/** Declared BEFORE running; see README. null fields block the run. */
export interface DecisionRule {
  /** Whisper must beat Chrome by at least this much aggregate WER (absolute, e.g. 0.02). */
  minWerImprovementOverChrome: number | null;
  /** Max hallucinated outputs tolerated for a Whisper config to be adoptable (plan: 0). */
  maxHallucinations: number;
  /** large-v3 over turbo only if accent-clip WER improves by at least this (absolute). */
  minAccentMarginForLargeV3: number | null;
  /** large-v3 only if its p95 latency (ms) is within this. */
  maxP95LatencyMs: number | null;
}
