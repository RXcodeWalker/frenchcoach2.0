import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Ear, Keyboard, Lightbulb, Play, Trophy, AlertTriangle } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { Stat } from '../../components/ui/Stat';
import { enter, enterReduced } from '../../components/motion/variants';
import type { DicteeFormat, DicteeLevel } from '../../data/dictee';
import { canPlay, MIN_SLIPS_ROUND, poolFor, ROUND_SIZE, type Focus, type Setup } from './engine';
import type { VoiceStatus } from './audio';
import type { Best } from './store';
import { Stars } from './parts';

interface Props {
  setup: Setup;
  onChange: (next: Setup) => void;
  best: Best | null;
  /** Ids on the learner's "my slips" list. */
  slipIds: ReadonlySet<string>;
  voice: VoiceStatus;
  onStart: () => void;
}

const RULES = [
  { Icon: Ear, title: 'Listen', body: 'Hear a word or a sentence in French. Play it again, or slower, as often as you like.' },
  { Icon: Keyboard, title: 'Type what you hear', body: 'Spelling counts, and so do accents. The letter buttons help if your keyboard has none.' },
  { Icon: Lightbulb, title: 'See what to fix', body: 'Each slip is named, and words that sound alike (a or à, et or est) are explained.' },
] as const;

const LEVELS: { id: DicteeLevel; label: string; note: string }[] = [
  { id: 'A1', label: 'Warm-up', note: 'A1' },
  { id: 'A2', label: 'Exam level', note: 'A2' },
  { id: 'B1', label: 'Stretch', note: 'B1' },
];

export function SetupView({ setup, onChange, best, slipIds, voice, onStart }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;

  const counts = useMemo(() => {
    const at = (focus: Focus) => poolFor({ ...setup, focus }, slipIds).length;
    return { any: at('any'), 'sound-alikes': at('sound-alikes'), slips: at('slips') } as Record<Focus, number>;
  }, [setup, slipIds]);

  const pool = poolFor(setup, slipIds);
  const ready = canPlay(setup, pool) && voice !== 'none';
  const size = Math.min(ROUND_SIZE[setup.format], pool.length);
  const unit = setup.format === 'words' ? 'words' : 'sentences';

  const focuses: { id: Focus; label: string; count: number; show: boolean }[] = [
    { id: 'any', label: 'Anything', count: counts.any, show: true },
    { id: 'sound-alikes', label: 'Sound-alikes', count: counts['sound-alikes'], show: counts['sound-alikes'] >= ROUND_SIZE[setup.format] },
    { id: 'slips', label: 'My slips', count: counts.slips, show: counts.slips >= MIN_SLIPS_ROUND || setup.focus === 'slips' },
  ];

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <p className="text-eyebrow uppercase text-action-text">Listening game</p>
        <h2 className="mt-2 text-title text-ink">Hear it, then type it</h2>
        <p className="mt-1.5 text-[15px] font-light leading-[1.6] text-ink-muted">
          Short rounds that train your ear for French. Just for fun: it doesn't earn XP or count towards your streak.
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
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">What you hear</p>
          <Segmented<DicteeFormat>
            label="What you hear"
            value={setup.format}
            onChange={format => onChange({ ...setup, format, focus: 'any' })}
            height={60}
            testIdPrefix="dictee-format"
            options={[
              { id: 'words', label: 'Words', note: 'With the article · 10 a round' },
              { id: 'sentences', label: 'Sentences', note: 'A whole line · 6 a round' },
            ]}
          />
        </div>

        <div>
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">Level</p>
          <Segmented<DicteeLevel>
            label="Level"
            value={setup.level}
            onChange={level => onChange({ ...setup, level, focus: setup.focus === 'slips' ? 'slips' : 'any' })}
            height={60}
            testIdPrefix="dictee-level"
            options={LEVELS.map(l => ({ id: l.id, label: l.label, note: l.note, disabled: setup.focus === 'slips' }))}
          />
          {setup.focus === 'slips' && <p className="mt-1.5 text-[13px] text-ink-subtle">My slips come from every level.</p>}
        </div>

        <div>
          <p className="mb-2 text-eyebrow uppercase text-ink-subtle">Focus</p>
          <div role="group" aria-label="Focus" className="flex flex-wrap gap-2">
            {focuses
              .filter(f => f.show)
              .map(f => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={setup.focus === f.id}
                  onClick={() => onChange({ ...setup, focus: f.id })}
                  data-testid={`dictee-focus-${f.id}`}
                  className={`flex h-11 items-center gap-2 rounded-pill border px-3.5 text-[13px] font-semibold transition-colors duration-state ease-smooth active:scale-[.97]
                    ${setup.focus === f.id ? 'border-action bg-action-soft text-action-text' : 'border-hairline-strong text-ink-muted hover:bg-track hover:text-ink'}`}
                >
                  {f.label}
                  <span className={`font-numeral ${setup.focus === f.id ? 'text-action-text' : 'text-ink-subtle'}`}>{f.count}</span>
                </button>
              ))}
          </div>
          <p className="mt-2 text-[13px] leading-[1.5] text-ink-subtle">
            {setup.focus === 'sound-alikes'
              ? 'Lines where two spellings sound the same: a or à, et or est, ses or ces, on or ont.'
              : setup.focus === 'slips'
                ? 'Lines you missed before. Get one right twice in a row and it leaves the list.'
                : `Mixed ${unit} from across the topics.`}
          </p>
        </div>
      </motion.section>

      {voice === 'none' && (
        <motion.div variants={item} role="alert" className="flex gap-3 rounded-card border border-correction bg-correction-soft p-4 text-[14px] leading-[1.5] text-correction-text" data-testid="dictee-no-voice">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            This device can't speak French, so there is nothing to listen to. Try another browser, or install a French voice in your device's
            speech settings. An English voice reading French would teach the wrong spelling.
          </p>
        </motion.div>
      )}

      <motion.div variants={item} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {best ? (
            <Stat role="neutral" soft icon={<Trophy size={14} />}>
              Best {best.score} · {best.accuracy}%
            </Stat>
          ) : (
            <Stat role="neutral">No best yet on this setting</Stat>
          )}
          {best && <Stars value={best.stars} size={16} />}
        </div>
        <Button size="lg" onClick={onStart} disabled={!ready} className="sm:min-w-[200px]" data-testid="dictee-start">
          <Play size={16} aria-hidden="true" />
          {ready ? `Start · ${size} ${unit}` : 'Start'}
        </Button>
      </motion.div>
    </PageShell>
  );
}
