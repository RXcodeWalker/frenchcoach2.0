import { ChevronRight, TrendingUp } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import type { FeedbackV2, VocabularyEntry } from '../../../types';

const TIER_CONFIG: Record<VocabularyEntry['tier'], { label: string; color: string }> = {
  weak:       { label: 'Weak',       color: 'text-red-300' },
  decent:     { label: 'Decent',     color: 'text-amber-300' },
  advanced:   { label: 'Advanced',   color: 'text-emerald-300' },
  idiomatic:  { label: 'Idiomatic',  color: 'text-violet-300' },
  repetitive: { label: 'Repetitive', color: 'text-amber-400' },
  anglicism:  { label: 'Anglicism',  color: 'text-violet-400' },
};

interface Props {
  feedback: FeedbackV2;
}

export function VocabularyCard({ feedback }: Props) {
  const v2vocab = feedback.vocabularyV2 ?? [];
  const legacyVocab = feedback.vocabulary ?? [];

  const hasContent = v2vocab.length > 0 || legacyVocab.length > 0;
  if (!hasContent) return null;

  return (
    <CollapsibleCard
      title="Vocabulary"
      icon={<TrendingUp size={13} className="text-amber-400" />}
      badgeCount={v2vocab.length || legacyVocab.length}
      defaultOpen={false}
    >
      {v2vocab.length > 0 ? (
        <div className="space-y-2">
          {v2vocab.map((entry, i) => {
            const cfg = TIER_CONFIG[entry.tier];
            return (
              <div key={i} className="p-3 rounded-lg glass-subtle">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-slate-500 line-through">{entry.basic}</span>
                  <span className={`text-[9px] font-bold ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="space-y-1">
                  {entry.upgrades.map((up, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-[10px]">
                      <ChevronRight size={9} className="text-slate-700 flex-shrink-0 mt-0.5" />
                      <span className="text-emerald-300 font-medium">{up.phrase}</span>
                      <span className="text-[9px] text-slate-600 ml-auto">{up.level}</span>
                    </div>
                  ))}
                  {entry.upgrades[0]?.nuance && (
                    <p className="text-[9px] text-slate-600 pl-3.5 italic">{entry.upgrades[0].nuance}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {legacyVocab.map((v, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-subtle">
              <span className="text-[10px] text-slate-600 line-through">{v.basic}</span>
              <ChevronRight size={9} className="text-slate-700" />
              <span className="text-[10px] text-emerald-400 font-medium">{v.upgrade}</span>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
