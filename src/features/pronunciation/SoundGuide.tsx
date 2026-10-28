import { motion, useReducedMotion } from 'framer-motion';
import { Ear, Mic, PenLine, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced } from '../../components/motion/variants';
import { pairsFor } from '../../domain/pronunciation/lab/earTraining';
import { SCORED_FAMILIES, type FamilyStatus } from '../../domain/pronunciation/lab/soundFamilies';
import { SOUND_TIPS } from '../../domain/pronunciation/lab/tips';
import type { SoundFamilyId } from '../../domain/pronunciation/lab/types';
import { NATIVE_UNAVAILABLE } from './labCopy';
import { FAMILY_STATUS_DISPLAY } from './soundsCopy';
import { useNativePlayer } from './useNativePlayer';

/**
 * One sound's guide (pronunciation-lab plan §3.3 "Sound guide"): what it is in
 * plain English, the mouth tip, 4–6 example words with native audio, a minimal
 * pair, and the ways on — say an example in the Lab, hear the contrast in ear
 * training, practise sentences with the sound.
 *
 * Every word plays from the recorded catalogue (`guideTexts`), so the guide
 * costs nothing and asks the backend for nothing.
 */

interface Props {
  family: SoundFamilyId;
  /** Null for liaison and elision, which Azure doesn't score. */
  status: FamilyStatus | null;
  onSayWord: (word: string) => void;
  onEarTraining: () => void;
  onSentences: () => void;
}

export function SoundGuide({ family, status, onSayWord, onEarTraining, onSentences }: Props) {
  const reduced = useReducedMotion() ?? false;
  const tip = SOUND_TIPS[family];
  const native = useNativePlayer();
  const display = status ? FAMILY_STATUS_DISPLAY[status] : null;
  const hasEar = pairsFor(family).length > 0;
  const scored = (SCORED_FAMILIES as readonly SoundFamilyId[]).includes(family);

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
      aria-label={`${tip.name} guide`}
      data-testid="sound-guide"
    >
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow uppercase text-action-text">Sound guide</p>
        <h1 className="text-h1 text-ink">{tip.name}</h1>
        {display && (
          <span className={`inline-flex w-fit items-center gap-1 rounded-control px-2 py-0.5 text-caption font-semibold ${display.chip}`}>
            {display.glyph && <span aria-hidden="true">{display.glyph}</span>}
            {display.label}
          </span>
        )}
        {!scored && <p className="text-body-s text-ink-muted">You can see this one in the spelling, so the Lab teaches it rather than scoring it.</p>}
      </div>

      <p className="rounded-card border border-hairline bg-surface-recessed p-4 text-body-l text-ink">{tip.tip}</p>

      <section aria-labelledby="guide-examples" className="flex flex-col gap-3">
        <h2 id="guide-examples" className="text-section text-ink">Hear it</h2>
        <ul className="flex flex-col gap-2">
          {tip.examples.map((word) => (
            <li key={word} className="flex items-center gap-2 rounded-card border border-hairline bg-surface p-2 pl-4">
              <span className="min-w-0 flex-1 truncate text-[18px] text-ink" lang="fr">{word}</span>
              <Button variant="secondary" size="sm" onClick={() => void native.play(word)} aria-label={`Hear « ${word} »`}>
                <Volume2 size={16} aria-hidden="true" /> Hear
              </Button>
              <Button variant="quiet" size="sm" onClick={() => onSayWord(word)} aria-label={`Say « ${word} »`}>
                <Mic size={16} aria-hidden="true" /> Say it
              </Button>
            </li>
          ))}
        </ul>
        {native.unavailable && <p className="text-caption text-ink-muted">{NATIVE_UNAVAILABLE}</p>}
      </section>

      {tip.minimalPair && (
        <section aria-labelledby="guide-pair" className="flex flex-col gap-3">
          <h2 id="guide-pair" className="text-section text-ink">Hear the difference</h2>
          <div className="flex flex-wrap gap-2">
            {tip.minimalPair.map((word) => (
              <Button key={word} variant="secondary" onClick={() => void native.play(word)} aria-label={`Hear the pair word « ${word} »`}>
                <Volume2 size={16} aria-hidden="true" /> <span lang="fr">{word}</span>
              </Button>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2">
        {hasEar && (
          <Button variant="secondary" onClick={onEarTraining}>
            <Ear size={16} aria-hidden="true" /> Ear training for this sound
          </Button>
        )}
        <Button variant={hasEar ? 'quiet' : 'secondary'} onClick={onSentences}>
          <PenLine size={16} aria-hidden="true" /> Practise sentences with this sound
        </Button>
      </div>
    </motion.section>
  );
}
