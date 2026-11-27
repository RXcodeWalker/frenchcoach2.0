import { ArrowRight, TrendingUp } from 'lucide-react';
import { BreakdownCard } from './BreakdownCard';
import type { FeedbackV2, VocabularyEntry } from '../../../types';

const TIER_CONFIG: Record<VocabularyEntry['tier'], { label: string; color: string }> = {
  weak:       { label: 'Weak',       color: 'bg-correction-soft text-correction-text' },
  decent:     { label: 'Decent',     color: 'bg-reward-soft text-reward-text' },
  advanced:   { label: 'Advanced',   color: 'bg-progress-soft text-progress-text' },
  idiomatic:  { label: 'Idiomatic',  color: 'bg-action-soft text-action-text' },
  repetitive: { label: 'Repetitive', color: 'bg-reward-soft text-reward-text' },
  anglicism:  { label: 'Anglicism',  color: 'bg-action-soft text-action-text' },
};

interface Props {
  feedback: FeedbackV2;
}

/** Words the learner used, each with stronger ones to try (Breakdown only, owner 2026-11-13). */
export function VocabularyCard({ feedback }: Props) {
  const v2vocab = feedback.vocabularyV2 ?? [];
  const legacyVocab = feedback.vocabulary ?? [];
  if (v2vocab.length === 0 && legacyVocab.length === 0) return null;

  return (
    <BreakdownCard
      title="Vocabulary upgrades"
      icon={TrendingUp}
      tone="reward"
      count={v2vocab.length || legacyVocab.length}
      subtitle="Words you used, and stronger ones to try"
      collapsible={{ defaultOpen: true }}
    >
      <ul className="space-y-2">
        {v2vocab.length > 0
          ? v2vocab.map((entry, i) => {
              const cfg = TIER_CONFIG[entry.tier];
              return (
                <li key={i} className="rounded-control surface-recessed p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span lang="fr" className="text-body-s text-ink-muted">{entry.basic}</span>
                    <span className={`rounded-pill px-2 py-0.5 text-caption font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {entry.upgrades.map((up, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <ArrowRight size={14} className="mt-1 shrink-0 text-ink-subtle" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span lang="fr" className="text-body-s font-semibold text-progress-text">{up.phrase}</span>
                          {up.nuance && <span className="block text-caption text-ink-muted">{up.nuance}</span>}
                        </span>
                        <span className="shrink-0 rounded-pill bg-track px-1.5 py-0.5 text-caption text-ink-muted">{up.level}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })
          : legacyVocab.map((v, i) => (
              <li key={i} className="space-y-1 rounded-control surface-recessed p-3">
                <div className="flex items-center gap-2">
                  <span lang="fr" className="text-body-s text-ink-muted">{v.basic}</span>
                  <ArrowRight size={14} className="text-ink-subtle" aria-label="could be" />
                  <span lang="fr" className="text-body-s font-semibold text-progress-text">{v.upgrade}</span>
                </div>
                {/* How to say it — the backend sends an example sentence; showing it makes the word usable. */}
                {v.example && <p lang="fr" className="text-body-s italic text-ink-muted">« {v.example} »</p>}
                {v.nuance && <p className="text-caption text-ink-muted">{v.nuance}</p>}
              </li>
            ))}
      </ul>
    </BreakdownCard>
  );
}
