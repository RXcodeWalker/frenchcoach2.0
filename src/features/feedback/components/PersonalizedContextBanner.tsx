import { Sparkles } from 'lucide-react';

interface Props {
  sessionsAnalyzed: number;
  narrative?: string;
}

export function PersonalizedContextBanner({ sessionsAnalyzed, narrative }: Props) {
  if (sessionsAnalyzed < 1) return null;

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-violet-500/8 border border-violet-500/20">
      <Sparkles size={13} className="text-violet-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wide mb-0.5">
          Personalized · {sessionsAnalyzed} session{sessionsAnalyzed !== 1 ? 's' : ''} analyzed
        </p>
        {narrative && (
          <p className="text-[10px] text-ink-muted leading-relaxed">{narrative}</p>
        )}
      </div>
    </div>
  );
}
