import type { PronunciationProvider } from '../../domain/pronunciation/types';

interface Props {
  provider: PronunciationProvider;
}

/**
 * Second consumer of the "make degradation visible, don't hide it" principle
 * established for AI-provider failover (FailoverBadge.tsx, commit 161f1aa).
 * The Azure -> whisper-heuristic fallback here is a sharper case than that
 * one: the two tiers aren't "two AI providers of comparable quality" — the
 * heuristic tier is a word-alignment guess with no real acoustic signal,
 * while Azure is genuine phoneme-level analysis. Showing a heuristic result
 * with the same visual confidence as a real one would mislead a learner
 * about their actual pronunciation.
 *
 * Purely derived from the current result's `provider` field — no manual
 * dismiss state, so it naturally disappears on the next assessment.
 */
export function PronunciationSourceBadge({ provider }: Props) {
  if (provider === 'azure') return null;

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg glass-subtle">
      <span className="text-xs leading-none flex-shrink-0 mt-0.5">🎙️</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-300">Estimated pronunciation score</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
          Estimated from speech-recognition confidence — not full pronunciation analysis. Set up Azure Speech for detailed feedback.
        </p>
      </div>
    </div>
  );
}
