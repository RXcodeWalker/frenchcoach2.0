import { useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import { FEATURES, CATEGORIES, type FeatureCard } from '../data/features';
import { categoryHue, featureIcon } from '../features/explore/featureVisuals';
import { enter, enterReduced, stagger } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Segmented } from '../components/ui/Segmented';
import { ExploreSkillTree } from './explore/ExploreSkillTree';

type View = 'modes' | 'scenarios';

/**
 * Explore (Design System v2): the hub for every mode outside the five core
 * screens. A Modes/Scenarios switch, a category filter, then each category's
 * tiles — a lucide icon in a hued chip (`featureVisuals.ts`), the title and
 * one line. Locked tiles are static, never a hover.
 */
export function Explore() {
  const [view, setView] = useState<View>('modes');
  const [category, setCategory] = useState<string>('all');
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;

  const shown = CATEGORIES.filter(c => category === 'all' || c === category);

  return (
    <>
      <TopContextBar title="Explore" subtitle="Every mode, tool and challenge" />
      <PageShell maxWidth="xl" gap={24}>
        <motion.div variants={item} className="w-full max-w-[360px]">
          <Segmented<View>
            label="Explore view"
            value={view}
            onChange={setView}
            options={[
              { id: 'modes', label: 'Modes' },
              { id: 'scenarios', label: 'Scenarios' },
            ]}
          />
        </motion.div>

        {view === 'modes' ? (
          <>
            <motion.div variants={item} role="group" aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
              {['all', ...CATEGORIES].map(c => (
                <FilterChip key={c} on={category === c} onClick={() => setCategory(c)}>
                  {c === 'all' ? 'All' : c}
                </FilterChip>
              ))}
            </motion.div>

            <motion.div key={category} className="flex flex-col gap-8" variants={stagger} initial="hidden" animate="show">
              {shown.map(c => {
                const features = FEATURES.filter(f => f.category === c);
                if (features.length === 0) return null;
                const open = features.filter(f => !f.locked).length;
                return (
                  <motion.section key={c} variants={item} aria-labelledby={`explore-${c}`} className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 id={`explore-${c}`} className="text-section text-ink">{c}</h2>
                      <span className="text-caption text-ink-subtle">{open} of {features.length} open</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {features.map(f => <FeatureTile key={f.id} feature={f} />)}
                    </div>
                  </motion.section>
                );
              })}
            </motion.div>
          </>
        ) : (
          <motion.div variants={item}>
            <ExploreSkillTree />
          </motion.div>
        )}
      </PageShell>
    </>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-9 shrink-0 rounded-pill border px-3.5 text-label transition-colors duration-state ease-smooth active:scale-[.97]
        ${on ? 'border-action bg-action-soft text-action-text' : 'border-hairline bg-surface text-ink-muted hover:border-hairline-strong hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

function FeatureTile({ feature }: { feature: FeatureCard }) {
  const navigate = useNavigate();
  const Icon = featureIcon(feature.id);

  const chip = feature.locked ? (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-recessed text-ink-subtle">
      <Lock size={18} strokeWidth={1.75} />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="topic-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-control"
      style={{ '--h': categoryHue(feature.category) } as CSSProperties}
    >
      <Icon size={20} strokeWidth={1.75} />
    </span>
  );

  const body = (
    <>
      {chip}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className={`truncate text-[15px] font-semibold leading-snug ${feature.locked ? 'text-ink-muted' : 'text-ink'}`}>
            {feature.title}
          </span>
          {feature.badge && !feature.locked && (
            <span className="shrink-0 rounded-pill bg-action-soft px-2 py-0.5 text-caption font-semibold text-action-text">{feature.badge}</span>
          )}
        </span>
        <span className="text-body-s text-ink-muted">{feature.description}</span>
        {feature.locked && <span className="mt-1 text-caption text-ink-subtle">Coming soon</span>}
      </span>
    </>
  );

  if (feature.locked || !feature.screen) {
    return <div className="flex items-start gap-3 rounded-card surface-recessed p-4">{body}</div>;
  }

  const go = () => {
    const path = feature.screen === 'home' ? '/' : `/${feature.screen}`;
    navigate(path + (feature.tab ? `?tab=${feature.tab}` : ''));
  };

  return (
    <button
      type="button"
      onClick={go}
      data-testid={`explore-${feature.id}`}
      className="group flex items-start gap-3 rounded-card surface p-4 text-left transition-[background-color,border-color,transform] duration-state ease-smooth
        hover:border-hairline-strong hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] active:scale-[.97]"
    >
      {body}
      <ChevronRight size={16} aria-hidden="true" className="mt-3 shrink-0 text-ink-subtle transition-colors duration-state group-hover:text-ink-muted" />
    </button>
  );
}
