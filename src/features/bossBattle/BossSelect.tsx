import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { enter, enterReduced } from '../../components/motion/variants';
import { PageShell } from '../../components/layout/PageShell';
import { TopContextBar } from '../../components/TopContextBar';
import { BOSSES, type Boss } from './bosses';
import type { BossRecordsV1 } from './bossStore';
import { DIFFICULTY_STYLE, MOVE_VISUALS } from './bossVisuals';
import { MOVES } from './engine';
import { BossChip, Stars } from './parts';

interface Props {
  records: BossRecordsV1;
  onPick: (boss: Boss) => void;
  onBack: () => void;
}

/**
 * Boss Battles — choose a boss (Design System v2): how a fight works in four
 * lines, then one card per boss with the grammar it drills, its trick, and
 * your best stars. Hierarchy is surface + hairline; the boss hue lives only in
 * the icon chip. The first boss you have not beaten is marked "Next up".
 */
export function BossSelect({ records, onPick, onBack }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const nextUp = BOSSES.find((b) => (records.bosses[b.id]?.stars ?? 0) === 0)?.id;

  return (
    <>
      <TopContextBar title="Boss Battles" subtitle="Defeat the grammar bosses" showBack backLabel="Back to Explore" onBack={onBack} />
      <PageShell maxWidth="xl" gap={24}>
        <motion.section variants={item} aria-labelledby="boss-how" className="rounded-card surface-recessed p-4 md:p-5">
          <h2 id="boss-how" className="text-section text-ink">How a fight works</h2>
          <p className="mt-1.5 max-w-[68ch] text-body-s text-ink-muted">
            Each round you get a sentence in English. Choose a move, then type it in French. A correct answer
            lands your move; a wrong one lets the boss hit back. Every few rounds it also lands a heavy blow, so
            plan your Guard. Every correct answer charges Focus.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {MOVES.map((m) => {
              const v = MOVE_VISUALS[m];
              return (
                <li key={m} className="flex items-start gap-2.5 rounded-control border border-hairline bg-surface p-3">
                  <v.Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-action-text" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-label text-ink">
                      {v.label}
                      {v.cost && <span className="font-normal text-ink-subtle"> · costs {v.cost}</span>}
                    </span>
                    <span className="text-caption text-ink-muted">{v.effect}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </motion.section>

        <motion.div variants={item} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {BOSSES.map((boss) => {
            const record = records.bosses[boss.id];
            const difficulty = DIFFICULTY_STYLE[boss.difficulty];
            return (
              <button
                key={boss.id}
                type="button"
                onClick={() => onPick(boss)}
                data-testid={`boss-${boss.id}`}
                className="group flex flex-col gap-3 rounded-card surface p-4 text-left transition-[background-color,border-color,transform] duration-state ease-smooth
                  hover:border-hairline-strong hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] active:scale-[.97]"
              >
                <span className="flex items-start gap-3">
                  <BossChip id={boss.id} size={48} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[16px] font-semibold leading-snug text-ink">{boss.name}</span>
                    <span className="text-body-s text-ink-muted">{boss.title}</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="mt-1 shrink-0 text-ink-subtle transition-colors duration-state group-hover:text-ink-muted" />
                </span>

                <span className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex h-6 items-center rounded-pill border px-2.5 text-caption font-semibold ${difficulty.className}`}>{difficulty.label}</span>
                  {nextUp === boss.id && (
                    <span className="inline-flex h-6 items-center rounded-pill bg-action-soft px-2.5 text-caption font-semibold text-action-text">Next up</span>
                  )}
                  <span className="text-caption text-ink-subtle">{boss.hp} health</span>
                </span>

                <span className="text-body-s text-ink-muted">{boss.blurb}</span>

                <span className="flex flex-col gap-1 rounded-control surface-recessed p-3">
                  <span className="text-caption text-ink-subtle">Drills {boss.focus}</span>
                  <span className="text-body-s text-ink">
                    <span className="font-semibold">{boss.mechanicName}.</span> {boss.mechanicRule}
                  </span>
                </span>

                <span className="mt-auto flex items-center justify-between gap-3 pt-1">
                  <Stars value={record?.stars ?? 0} size={18} />
                  <span className="text-caption text-ink-subtle">
                    {record && record.fights > 0
                      ? `Won ${record.wins} of ${record.fights} · best combo ×${record.bestCombo}`
                      : 'Not fought yet'}
                  </span>
                </span>
              </button>
            );
          })}
        </motion.div>
      </PageShell>
    </>
  );
}
