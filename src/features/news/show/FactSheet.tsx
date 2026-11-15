import { ClipboardList } from 'lucide-react';
import type { NewsFact, NewsLevelId } from '../../../data/news/types';

interface Props {
  facts: readonly NewsFact[];
  level: NewsLevelId;
}

/**
 * The interview's fact sheet (daily-news §7): the learner's own notes, in
 * role, to answer Henri's questions from. Notes, not sentences — English at A2,
 * French notes at B1/B2 — so the learner builds each sentence themselves.
 */
export function FactSheet({ facts, level }: Props) {
  return (
    <section className="rounded-card border border-hairline bg-surface p-5 md:p-6" aria-labelledby="news-fact-sheet" data-testid="news-fact-sheet">
      <h3 id="news-fact-sheet" className="inline-flex items-center gap-2 text-label text-ink">
        <ClipboardList size={16} className="text-ink-subtle" aria-hidden="true" /> Your fact sheet
      </h3>
      <p className="mt-1 text-body-s text-ink-muted">
        {level === 'a2'
          ? 'Your notes are in English: say them in French. Add a detail or two from the sheet to make an answer longer.'
          : 'These are notes, not sentences: turn each one into a full sentence, in the right tense.'}
      </p>
      <dl className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,10rem)_1fr]">
        {facts.map(f => (
          <div key={f.id} className="contents">
            <dt className="text-caption text-ink-subtle sm:pt-0.5">{f.label}</dt>
            <dd lang={level === 'a2' ? 'en' : 'fr'} className="text-body-s text-ink max-sm:mb-1">{f.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
