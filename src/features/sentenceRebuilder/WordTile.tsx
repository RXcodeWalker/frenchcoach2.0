import { motion, useReducedMotion } from 'framer-motion';
import { press, slide } from '../../components/motion/variants';

export type TileTone = 'plain' | 'placed' | 'right' | 'wrong' | 'done';

const TONE: Record<TileTone, string> = {
  plain: 'border-hairline-strong bg-surface text-ink hover:bg-track',
  placed: 'border-action bg-action-soft text-action-text',
  right: 'border-progress bg-progress-soft text-progress-text',
  wrong: 'border-correction bg-correction-soft text-correction-text',
  done: 'border-progress bg-progress-soft text-progress-text',
};

interface Props {
  /** Shared by the bank copy and the line copy, so a tapped word glides between them. */
  tileId: string;
  text: string;
  tone: TileTone;
  disabled?: boolean;
  /** Spoken in place of the word, e.g. "j'aime, in the right place". */
  label?: string;
  onActivate: (viaKeyboard: boolean) => void;
}

/** One French word as a button. */
export function WordTile({ tileId, text, tone, disabled, label, onActivate }: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      layout
      layoutId={tileId}
      transition={reduced ? { duration: 0 } : slide}
      whileTap={disabled ? undefined : press}
      disabled={disabled}
      aria-label={label}
      lang="fr"
      onClick={e => onActivate(e.detail === 0)}
      className={`inline-flex h-12 min-w-[48px] items-center justify-center rounded-control border px-4 text-[17px] font-semibold
        transition-colors duration-state ease-smooth disabled:cursor-default ${TONE[tone]}`}
    >
      {text}
    </motion.button>
  );
}

/** Where a word was: keeps the bank from reflowing when a word moves up to the line. */
export function TileGhost({ text }: { text: string }) {
  return (
    <span
      aria-hidden="true"
      lang="fr"
      className="inline-flex h-12 min-w-[48px] items-center justify-center rounded-control border border-dashed border-hairline px-4 text-[17px] font-semibold"
    >
      <span className="invisible">{text}</span>
    </span>
  );
}

/** An empty place on the line: shows how many words the sentence has. */
export function EmptySlot() {
  return <span aria-hidden="true" className="inline-flex h-12 w-12 rounded-control border border-dashed border-hairline-strong" />;
}
