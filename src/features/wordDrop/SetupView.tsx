import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Keyboard, Play, RotateCcw, Trophy } from 'lucide-react';
import { TOPICS } from '../../data/questions';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { Stat } from '../../components/ui/Stat';
import { TopicChip } from '../../components/ui/TopicChip';
import { enter, enterReduced } from '../../components/motion/variants';
import type { Best } from './bestStore';
import { topicCounts } from './wordPool';
import type { Direction, Pace, PoolWord } from './types';

export interface Setup {
  direction: Direction;
  pace: Pace;
  /** A topic key, or `all`. */
  topic: string;
}

interface Props {
  pool: readonly PoolWord[];
  setup: Setup;
  onChange: (next: Setup) => void;
  best: Best | null;
  onStart: () => void;
}

/** Topics worth a chip: the core ones with enough words to play a round. */
const MIN_TOPIC_WORDS = 40;

const RULES = [
  { Icon: Keyboard, title: 'Type the meaning', body: 'Words fall one by one. Type what each one means and it clears.' },
  { Icon: Flame, title: 'Build a streak', body: 'Five in a row raises your multiplier. Ten wins a heart back.' },
  { Icon: RotateCcw, title: 'Misses come back', body: 'A word you miss returns for a second go and lands in your review.' },
] as const;

/** First half of an English topic name: "School & Education" → "School". */
const shortName = (labelEn: string) => labelEn.split(' & ')[0];

export function SetupView({ pool, setup, onChange, best, onStart }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const counts = useMemo(() => topicCounts(pool), [pool]);
  const topics = useMemo(
    () => TOPICS.filter(t => !t.isAdvanced && (counts[t.key] ?? 0) >= MIN_TOPIC_WORDS),
    [counts],
  );
  const wordsInPlay = setup.topic === 'all' ? pool.length : (counts[setup.topic] ?? 0);

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <p className="text-eyebrow uppercase text-action-text">Word game</p>
        <h2 className="mt-2 text-title text-ink">Catch every word before it lands</h2>
        <p className="mt-1.5 text-[15px] font-light leading-[1.6] text-ink-muted">
          Quick rounds on the vocabulary you meet in Learn. Just for fun: it doesn't earn XP or count towards your streak.
        </p>

        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {RULES.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-control bg-surface-recessed p-3">
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text">
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-[13px] font-normal leading-[1.45] text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section variants={item} className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div>
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">Direction</p>
          <Segmented<Direction>
            label="Direction"
            value={setup.direction}
            onChange={direction => onChange({ ...setup, direction })}
            height={60}
            options={[
              { id: 'fr-en', label: 'French → English', note: 'French falls, you type English' },
              { id: 'en-fr', label: 'English → French', note: 'English falls, you type French' },
            ]}
          />
        </div>

        <div>
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">Pace</p>
          <Segmented<Pace>
            label="Pace"
            value={setup.pace}
            onChange={pace => onChange({ ...setup, pace })}
            height={60}
            options={[
              { id: 'relaxed', label: 'Relaxed', note: 'Time to think' },
              { id: 'steady', label: 'Steady', note: 'A fair test' },
              { id: 'quick', label: 'Quick', note: 'Fast hands' },
            ]}
          />
        </div>

        <div>
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">Words from</p>
          <div role="group" aria-label="Topic" className="flex flex-wrap gap-2">
            <TopicPill on={setup.topic === 'all'} onClick={() => onChange({ ...setup, topic: 'all' })} count={pool.length}>
              All topics
            </TopicPill>
            {topics.map(t => (
              <TopicPill
                key={t.key}
                on={setup.topic === t.key}
                onClick={() => onChange({ ...setup, topic: t.key })}
                count={counts[t.key] ?? 0}
                topicKey={t.key}
              >
                {shortName(t.labelEn)}
              </TopicPill>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.div variants={item} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {best ? (
            <Stat role="reward" soft icon={<Trophy size={14} />}>Best {best.score} · Wave {best.wave}</Stat>
          ) : (
            <Stat role="neutral">No best yet on this setting</Stat>
          )}
          <span className="text-[13px] text-ink-subtle">{wordsInPlay.toLocaleString('en-GB')} words</span>
        </div>
        <Button size="lg" onClick={onStart} disabled={wordsInPlay < 8} className="sm:min-w-[200px]">
          <Play size={16} aria-hidden="true" />
          Start game
        </Button>
      </motion.div>
    </PageShell>
  );
}

function TopicPill({
  on, onClick, count, topicKey, children,
}: { on: boolean; onClick: () => void; count: number; topicKey?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-11 items-center gap-2 rounded-pill border pr-3 text-[13px] font-semibold transition-colors duration-state ease-smooth
        active:scale-[.97] ${topicKey ? 'pl-2' : 'pl-3.5'}
        ${on ? 'border-action bg-action-soft text-action-text' : 'border-hairline-strong text-ink-muted hover:bg-track hover:text-ink'}`}
    >
      {topicKey && <TopicChip topicKey={topicKey} size={28} />}
      <span>{children}</span>
      <span className={`font-numeral ${on ? 'text-action-text' : 'text-ink-subtle'}`}>{count}</span>
    </button>
  );
}
