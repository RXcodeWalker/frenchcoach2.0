import { motion } from 'framer-motion';
import { Ear, ChevronRight, ListChecks, PenLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { fadeUp, stagger } from '../../components/motion/variants';
import { SCORED_FAMILIES, SOUND_FAMILIES, type ScoredFamilyId } from '../../domain/pronunciation/lab/soundFamilies';
import { historyStatuses, type LabHistory } from '../../domain/pronunciation/lab/labHistory';
import { SOUND_TIPS } from '../../domain/pronunciation/lab/tips';
import type { SoundFamilyId } from '../../domain/pronunciation/lab/types';
import { localDay, trickyDeck } from '../../domain/pronunciation/lab/trickyWords';
import { FAMILY_STATUS_DISPLAY, HOME_INTRO, HOME_TITLE, TEXT_ONLY_NOTE, YOUR_SOUNDS_HELP, trickyCardNote } from './soundsCopy';

/**
 * The Lab home (pronunciation-lab plan §3.3): Your sounds, and the ways in to
 * the guide, ear training, tricky words and sentence practice. The screen
 * (`screens/LearnSounds.tsx`) owns which view is open.
 *
 * Status comes from Lab takes only (`historyStatuses`); liaison and elision
 * are spelling features Azure doesn't score, so they have a guide but no
 * status (plan §5.2).
 */

interface Props {
  history: LabHistory;
  onOpenGuide: (family: SoundFamilyId) => void;
  onOpenEar: () => void;
  onOpenTricky: () => void;
  onOpenPractise: () => void;
}

const TEXT_ONLY = SOUND_FAMILIES.filter((f) => !(SCORED_FAMILIES as readonly SoundFamilyId[]).includes(f));

function ActionCard({ icon, title, note, onClick, testId }: { icon: ReactNode; title: string; note: string; onClick: () => void; testId: string }) {
  return (
    <motion.button
      type="button"
      variants={fadeUp}
      onClick={onClick}
      data-testid={testId}
      className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4 text-left text-ink
        transition-colors duration-state ease-smooth hover:border-hairline-strong active:bg-surface-recessed"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-hairline bg-surface-recessed text-action-text" aria-hidden="true">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold">{title}</span>
        <span className="text-[13px] text-ink-subtle">{note}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
    </motion.button>
  );
}

export function SoundsHome({ history, onOpenGuide, onOpenEar, onOpenTricky, onOpenPractise }: Props) {
  const statuses = historyStatuses(history);
  const deck = trickyDeck(history.words, localDay(new Date()));

  return (
    <motion.div className="flex flex-col gap-8" variants={stagger} initial="hidden" animate="show" data-testid="sounds-home">
      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink">{HOME_TITLE}</h1>
        <p className="text-body-l text-ink-muted">{HOME_INTRO}</p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
        <ActionCard icon={<PenLine size={20} />} title="Practise a sentence" note="Listen, say it, compare" onClick={onOpenPractise} testId="sounds-practise" />
        <ActionCard icon={<Ear size={20} />} title="Ear training" note="Which word did you hear? No recording" onClick={onOpenEar} testId="sounds-ear" />
        <ActionCard icon={<ListChecks size={20} />} title="Tricky words" note={trickyCardNote(deck)} onClick={onOpenTricky} testId="sounds-tricky" />
      </motion.div>

      <section aria-labelledby="your-sounds" className="flex flex-col gap-3">
        <motion.div variants={fadeUp} className="flex flex-col gap-1">
          <h2 id="your-sounds" className="text-section text-ink">Your sounds</h2>
          <p className="text-body-s text-ink-muted">{YOUR_SOUNDS_HELP}</p>
        </motion.div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,170px),1fr))]">
          {SCORED_FAMILIES.map((family: ScoredFamilyId) => {
            const status = FAMILY_STATUS_DISPLAY[statuses[family]];
            return (
              <motion.button
                key={family}
                type="button"
                variants={fadeUp}
                onClick={() => onOpenGuide(family)}
                aria-label={`${SOUND_TIPS[family].name}: ${status.label}. Open the guide`}
                data-testid={`family-${family}`}
                className="flex flex-col items-start gap-2 rounded-card border border-hairline bg-surface p-4 text-left text-ink
                  transition-colors duration-state ease-smooth hover:border-hairline-strong active:bg-surface-recessed"
              >
                <span className="text-[15px] font-semibold leading-[1.3]">{SOUND_TIPS[family].name}</span>
                <span className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-caption font-semibold ${status.chip}`}>
                  {status.glyph && <span aria-hidden="true">{status.glyph}</span>}
                  {status.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
          <span className="text-body-s text-ink-muted">{TEXT_ONLY_NOTE}</span>
          {TEXT_ONLY.map((family) => (
            <button
              key={family}
              type="button"
              onClick={() => onOpenGuide(family)}
              data-testid={`family-${family}`}
              className="h-10 rounded-pill border border-hairline-strong px-3.5 text-[13px] font-semibold text-ink
                transition-colors duration-state ease-smooth hover:bg-track"
            >
              {SOUND_TIPS[family].name}
            </button>
          ))}
        </motion.div>
      </section>
    </motion.div>
  );
}
