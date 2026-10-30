import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw, Target, Trophy, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { CountUp } from '../../components/motion/CountUp';
import { celebrate, enter, enterReduced } from '../../components/motion/variants';
import { TTS } from '../../services/tts/ttsService';
import type { BestUpdate } from './bests';
import { missedWords, type RunEntry, type RunSummary } from './run';

interface Props {
  summary: RunSummary;
  setLabel: string;
  bestUpdate: BestUpdate;
  onPlayAgain: () => void;
  onDrill: () => void;
  onChangeSet: () => void;
  onExit: () => void;
}

const HEADLINE: Record<RunSummary['endReason'], string> = {
  time: "Time's up",
  hearts: 'Out of hearts',
  cleared: 'All cleared',
  quit: 'Run ended',
};

function Tile({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-control bg-surface-recessed p-4" data-testid={testId}>
      <p className="text-body-s text-ink-subtle">{label}</p>
      <p className="mt-1 font-numeral text-num-l text-ink">{children}</p>
    </div>
  );
}

function ListenButton({ text }: { text: string }) {
  if (!TTS.isSupported() || !TTS.canSpeakFrench()) return null;
  return (
    <Button variant="quiet" size="md" aria-label={`Hear ${text}`} onClick={() => void TTS.speak(text)} className="!px-0 w-11 shrink-0">
      <Volume2 size={16} aria-hidden="true" />
    </Button>
  );
}

function Row({ entry }: { entry: RunEntry }) {
  const others = entry.word.answers.filter(a => a !== entry.expected).slice(0, 2);
  const note =
    entry.kind === 'skipped' ? 'Skipped'
    : entry.kind === 'almost' ? 'One slip'
    : entry.kind === 'wrong' ? 'Missed'
    : 'Accents';
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-body-s text-ink-subtle">{entry.word.prompt}</p>
        <p lang="fr" className="text-subtitle text-ink [overflow-wrap:anywhere]">{entry.expected}</p>
        {others.length > 0 && (
          <p className="text-caption text-ink-subtle">Also accepted: <span lang="fr">{others.join(', ')}</span></p>
        )}
        {entry.kind !== 'correct' && entry.typed && (
          <p className="text-body-s text-ink-muted">
            You typed <span lang="fr" className="text-correction-text line-through">{entry.typed}</span>
          </p>
        )}
      </div>
      <span className="shrink-0 rounded-pill bg-surface-recessed px-2.5 py-1 text-caption text-ink-muted">{note}</span>
      <ListenButton text={entry.expected} />
    </li>
  );
}

/** The end of a run: points, rank, the words to practise, and one primary Play again. */
export function RapidFireResults({ summary, setLabel, bestUpdate, onPlayAgain, onDrill, onChangeSet, onExit }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const missed = missedWords(summary.log);
  // One row per word to practise: the first miss, or a correct answer typed without accents.
  const seen = new Set<string>();
  const rows = summary.log.filter(e => {
    if (e.kind === 'correct' && !e.accentsMissed) return false;
    if (seen.has(e.word.id)) return false;
    seen.add(e.word.id);
    return true;
  });
  const { previous, isNewBest } = bestUpdate;
  const drill = summary.mode === 'drill';

  return (
    <PageShell maxWidth="md" gap={16}>
      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="rf-result">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow uppercase text-ink-subtle">{setLabel}{drill ? ' · missed words' : ''}</p>
            <h2 id="rf-result" className="mt-2 text-title text-ink">{HEADLINE[summary.endReason]}</h2>
          </div>
          {!drill && (
            <div
              className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-card bg-action-soft"
              aria-label={`Rank ${summary.rank}`}
              data-testid="rf-rank"
            >
              <span className="font-numeral text-num-xl text-action-text">{summary.rank}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <p className="font-numeral text-num-xl text-ink">
              <CountUp value={summary.score} data-testid="rf-final-score" />
            </p>
            <p className="text-body-s text-ink-subtle">points</p>
          </div>
          {isNewBest && (
            <motion.span
              variants={celebrate}
              initial="hidden"
              animate="show"
              className="mb-1 inline-flex h-7 items-center gap-1.5 rounded-pill bg-action-soft px-2.5 text-label text-action-text"
              data-testid="rf-new-best"
            >
              <Trophy size={14} aria-hidden="true" />
              {previous ? `New best, +${summary.score - previous.score}` : 'First best set'}
            </motion.span>
          )}
          {!isNewBest && previous && !drill && (
            <span className="mb-1 text-body-s text-ink-muted">Best: <span className="font-numeral text-ink">{previous.score}</span></span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Tile label="Correct" testId="rf-tile-correct">{summary.correct}<span className="text-body-s text-ink-subtle"> of {summary.total}</span></Tile>
          <Tile label="Accuracy" testId="rf-tile-accuracy">{summary.accuracy}<span className="text-body-s text-ink-subtle">%</span></Tile>
          <Tile label="Best combo" testId="rf-tile-combo">{summary.maxStreak}<span className="text-body-s text-ink-subtle"> in a row</span></Tile>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Button size="lg" onClick={onPlayAgain} data-testid="rf-again">
            <RotateCcw size={16} aria-hidden="true" />
            {drill ? 'Back to a full sprint' : 'Play again'}
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            {missed.length > 0 && !drill && (
              <Button variant="secondary" size="lg" className="flex-1" onClick={onDrill} data-testid="rf-drill">
                <Target size={16} aria-hidden="true" />
                Practise {missed.length} missed {missed.length === 1 ? 'word' : 'words'}
              </Button>
            )}
            <Button variant="secondary" size="lg" className="flex-1" onClick={onChangeSet}>Change word set</Button>
            <Button variant="quiet" size="lg" onClick={onExit}>Back to Explore</Button>
          </div>
        </div>
        <p className="mt-4 text-caption text-ink-subtle">Rapid Fire doesn&rsquo;t earn XP yet.</p>
      </motion.section>

      <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="rf-practise">
        <h2 id="rf-practise" className="text-section text-ink">Words to practise</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-body-s text-ink-muted" data-testid="rf-clean">
            {summary.total === 0 ? 'No answers this time.' : 'A clean run. Nothing to fix.'}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-hairline" data-testid="rf-rows">
            {rows.map(e => <Row key={e.word.id} entry={e} />)}
          </ul>
        )}
      </motion.section>
    </PageShell>
  );
}
