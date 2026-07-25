import type { AIEngine, EngineMetadata } from '../../types';

const ENGINE_LABEL: Record<AIEngine, string> = { gemini: 'Gemini', groq: 'Groq', offline: 'Offline' };

interface Props {
  engineMeta: EngineMetadata | undefined;
}

/**
 * Inline badge shown above feedback when the requested engine failed and a
 * different one produced the result. Purely derived from the current
 * feedback's engineMeta, so it naturally disappears on the next evaluation
 * (a fresh feedback object with its own engineMeta) instead of needing
 * manual dismiss/reset state.
 */
export function FailoverBadge({ engineMeta }: Props) {
  if (!engineMeta) return null;
  const { requestedEngine, actualEngine, fallbackUsed } = engineMeta;
  // Offline fallback has its own dedicated banner (OfflineLimitationsBanner) —
  // this badge is only for a real provider swap (Gemini <-> Groq).
  if (!fallbackUsed || actualEngine === requestedEngine || actualEngine === 'offline') return null;

  const requestedLabel = ENGINE_LABEL[requestedEngine];
  const actualLabel = ENGINE_LABEL[actualEngine];

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg glass-subtle">
      <span className="text-xs leading-none flex-shrink-0 mt-0.5">🔀</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-300">Redirected to {actualLabel}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
          {requestedLabel} was unavailable, so your response was evaluated using {actualLabel}.
        </p>
      </div>
    </div>
  );
}
