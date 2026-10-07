import { ChevronRight, TrendingUp } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import type { FeedbackV2, VocabularyEntry } from '../../../types';

const TIER_CONFIG: Record<VocabularyEntry['tier'], { label: string; color: string }> = {
  weak:       { label: 'Weak',       color: 'text-correction-text' },
  decent:     { label: 'Decent',     color: 'text-reward-text' },
  advanced:   { label: 'Advanced',   color: 'text-progress-text' },
  idiomatic:  { label: 'Idiomatic',  color: 'text-action-text' },
  repetitive: { label: 'Repetitive', color: 'text-reward-text' },
  anglicism:  { label: 'Anglicism',  color: 'text-action-text' },
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
      icon={<TrendingUp size={13} className="text-reward-text" />}
      badgeCount={v2vocab.length || legacyVocab.length}
      defaultOpen={false}
    >
      {v2vocab.length > 0 ? (
        <div className="space-y-2">
          {v2vocab.map((entry, i) => {
            const cfg = TIER_CONFIG[entry.tier];
            return (
              <div key={i} className="p-3 rounded-lg surface-recessed">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-ink-muted line-through">{entry.basic}</span>
                  <span className={`text-[9px] font-bold ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="space-y-1">
                  {entry.upgrades.map((up, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-[10px]">
                      <ChevronRight size={9} className="text-ink-subtle flex-shrink-0 mt-0.5" />
                      <span className="text-progress-text font-medium">{up.phrase}</span>
                      <span className="text-[9px] text-ink-subtle ml-auto">{up.level}</span>
                    </div>
                  ))}
                  {entry.upgrades[0]?.nuance && (
                    <p className="text-[9px] text-ink-subtle pl-3.5 italic">{entry.upgrades[0].nuance}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {legacyVocab.map((v, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg surface-recessed">
              <span className="text-[10px] text-ink-subtle line-through">{v.basic}</span>
              <ChevronRight size={9} className="text-ink-subtle" />
              <span className="text-[10px] text-progress-text font-medium">{v.upgrade}</span>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
