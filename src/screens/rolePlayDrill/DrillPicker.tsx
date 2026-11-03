import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Shuffle } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { TopContextBar } from '../../components/TopContextBar';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced, fill } from '../../components/motion/variants';
import { hasEnglishInstructions, type StoryCard } from '../../data/storyCards';
import type { CardProgress } from '../../features/rolePlayDrill/drillProgress';

interface Props {
  cards: StoryCard[];
  progress: Map<string, CardProgress>;
  onOpen: (card: StoryCard) => void;
  onSurprise: () => void;
  onBack: () => void;
}

/**
 * The drill's card list (Design System v2): what this is and how it differs
 * from a full exam, then the cards in two groups — with English instructions
 * first (a way in), then French-only exam-style cards.
 */
export function DrillPicker({ cards, progress, onOpen, onSurprise, onBack }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const guided = cards.filter(hasEnglishInstructions);
  const frenchOnly = cards.filter((c) => !hasEnglishInstructions(c));
  const done = cards.filter((c) => progress.get(c.id)?.done).length;

  return (
    <>
      <TopContextBar title="Role-play drill" subtitle="Exam · Part 1 practice" showBack onBack={onBack} backLabel="Back to Exam" />
      <PageShell maxWidth="xl" gap={24}>
        <motion.section variants={item} aria-labelledby="drill-intro" className="flex flex-col gap-4 rounded-card surface p-6">
          <div className="flex flex-col gap-2">
            <span className="text-eyebrow uppercase text-ink-subtle">Part 1 of the speaking test</span>
            <h1 id="drill-intro" className="exam-serif text-title text-ink">Practise the role play on its own</h1>
            <p className="max-w-[640px] text-body-base text-ink-muted">
              The examiner plays a character and asks you five short questions. Answer each one in a full
              sentence, and get coaching on every answer straight away. Nothing here is marked out of 40, and it
              doesn't use your weekly exam.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button size="lg" onClick={onSurprise}>
              <Shuffle size={16} aria-hidden="true" /> Surprise me
            </Button>
            <span className="text-body-s text-ink-muted">
              <span className="font-numeral text-ink">{done}</span> of <span className="font-numeral">{cards.length}</span> cards done
            </span>
          </div>
        </motion.section>

        <CardGroup
          id="drill-guided"
          title="With English instructions"
          note="Each card tells you what to say. A good place to start."
          cards={guided}
          progress={progress}
          onOpen={onOpen}
        />
        <CardGroup
          id="drill-french"
          title="Exam style"
          note="French only, like the real card. Listen to each question and answer it."
          cards={frenchOnly}
          progress={progress}
          onOpen={onOpen}
        />
      </PageShell>
    </>
  );
}

function CardGroup({
  id,
  title,
  note,
  cards,
  progress,
  onOpen,
}: {
  id: string;
  title: string;
  note: string;
  cards: StoryCard[];
  progress: Map<string, CardProgress>;
  onOpen: (card: StoryCard) => void;
}) {
  if (cards.length === 0) return null;
  const done = cards.filter((c) => progress.get(c.id)?.done).length;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 id={id} className="text-section text-ink">{title}</h2>
          <p className="mt-1 text-body-s text-ink-muted">{note}</p>
        </div>
        <span className="shrink-0 text-caption text-ink-subtle">
          <span className="font-numeral">{done}</span> of <span className="font-numeral">{cards.length}</span> done
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.id}>
            <CardTile card={card} progress={progress.get(card.id)} onOpen={() => onOpen(card)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardTile({ card, progress, onOpen }: { card: StoryCard; progress?: CardProgress; onOpen: () => void }) {
  const answered = progress?.answered ?? 0;
  const total = progress?.total ?? card.tasks.length;
  const isDone = progress?.done ?? false;
  const status = isDone ? 'Done' : answered > 0 ? `${answered} of ${total} answered` : `${total} exchanges`;
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`drill-card-${card.id}`}
      className="flex h-full w-full flex-col gap-3 rounded-card surface p-4 text-left
        transition-[border-color,transform] duration-state ease-smooth hover:border-hairline-strong active:scale-[.97]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="exam-serif text-subtitle text-ink">{card.title}</span>
        {isDone ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-progress text-action-ink" aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>
        ) : (
          <ChevronRight size={18} className="mt-1 shrink-0 text-ink-subtle" aria-hidden="true" />
        )}
      </div>
      <span className="text-body-s text-ink-muted">
        The examiner plays <span lang="fr" className="text-ink">{card.npc.nameFr}</span>
      </span>
      <div className="mt-auto flex flex-col gap-1.5">
        <span className="block h-1 overflow-hidden rounded-pill bg-track" aria-hidden="true">
          <motion.span
            className="block h-full rounded-pill bg-progress"
            initial={{ width: 0 }}
            animate={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
            transition={fill()}
          />
        </span>
        <span className={`text-caption ${isDone ? 'font-medium text-progress-text' : 'text-ink-subtle'}`}>{status}</span>
      </div>
    </button>
  );
}
