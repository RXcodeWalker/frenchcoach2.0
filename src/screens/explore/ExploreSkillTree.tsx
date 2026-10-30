import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Lock } from 'lucide-react';
import { getExploreTree, type TreeNode } from '../../data/exploreTree';
import { isPlayable } from '../../data/scenarios/registry';
import { scenarioVisual } from '../../features/explore/featureVisuals';
import { fill } from '../../components/motion/variants';

const TIER_NAMES = ['Foundation', 'Daily life', 'Exploration', 'Deep dive', 'Mastery'];

/**
 * Explore's Scenarios view (Design System v2): one section per tier, each a
 * grid of role-play cards. A playable scenario is a card you tap, with its
 * mastery as a progress bar (the `fill` motion); an unlocked one not yet
 * written says "Coming soon"; a locked one names what opens it.
 */
export function ExploreSkillTree() {
  const tree = getExploreTree();
  const titles = new Map(Object.values(tree).flat().map(n => [n.id, n.title]));

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(tree).map(([tier, nodes], i) => {
        const ready = nodes.filter(n => isPlayable(n.id, n.unlocked)).length;
        return (
          <section key={tier} aria-labelledby={`tier-${tier}`} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-eyebrow uppercase text-ink-subtle">Tier {i + 1}</div>
                <h2 id={`tier-${tier}`} className="mt-1 text-section text-ink">{TIER_NAMES[i] ?? `Tier ${i + 1}`}</h2>
              </div>
              <span className="text-caption text-ink-subtle">{ready} of {nodes.length} ready</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {nodes.map(node => (
                <ScenarioCard
                  key={node.id}
                  node={node}
                  needs={node.dependencies.map(d => titles.get(d) ?? d)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ScenarioCard({ node, needs }: { node: TreeNode; needs: string[] }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const playable = isPlayable(node.id, node.unlocked);
  const { Icon, hue } = scenarioVisual(node.category);
  const mastered = playable && node.mastery >= 100;

  const chip = playable ? (
    <span
      aria-hidden="true"
      className="topic-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-control"
      style={{ '--h': hue } as CSSProperties}
    >
      <Icon size={20} strokeWidth={1.75} />
    </span>
  ) : (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface text-ink-subtle">
      {node.unlocked ? <Icon size={20} strokeWidth={1.75} /> : <Lock size={18} strokeWidth={1.75} />}
    </span>
  );

  const status = playable ? null : node.unlocked ? 'Coming soon' : `Needs ${needs.join(', ')}`;

  const body = (
    <>
      <span className="flex items-start gap-3">
        {chip}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`truncate text-[15px] font-semibold leading-snug ${playable ? 'text-ink' : 'text-ink-muted'}`}>{node.title}</span>
          <span className="text-caption text-ink-subtle">{node.category}</span>
        </span>
        {playable && <ChevronRight size={16} aria-hidden="true" className="mt-3 shrink-0 text-ink-subtle transition-colors duration-state group-hover:text-ink-muted" />}
      </span>

      {playable ? (
        <span className="mt-3 flex items-center gap-2">
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-pill bg-track">
            <motion.span
              className="absolute inset-y-0 left-0 rounded-pill bg-progress"
              initial={{ width: reduced ? `${node.mastery}%` : 0 }}
              animate={{ width: `${node.mastery}%` }}
              transition={reduced ? { duration: 0 } : fill()}
            />
          </span>
          {mastered ? (
            <span className="inline-flex items-center gap-1 text-caption font-semibold text-progress-text">
              <Check size={14} aria-hidden="true" /> Mastered
            </span>
          ) : (
            <span className="font-numeral text-caption text-ink-subtle">{Math.round(node.mastery)}%</span>
          )}
        </span>
      ) : (
        <span className="mt-3 block text-caption text-ink-subtle">{status}</span>
      )}
    </>
  );

  if (!playable) {
    return <div className="flex flex-col rounded-card surface-recessed p-4">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/scenario/${node.id}`)}
      aria-label={`${node.title}, ${mastered ? 'mastered' : `${Math.round(node.mastery)}% mastered`}`}
      className="group flex flex-col rounded-card surface p-4 text-left transition-[background-color,border-color,transform] duration-state ease-smooth
        hover:border-hairline-strong hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] active:scale-[.97]"
    >
      {body}
    </button>
  );
}
