import type { ReactNode } from 'react';
import { BookOpen, Check, ChevronRight, FolderSearch, MessagesSquare, Search, Shuffle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Stat } from '../../components/ui/Stat';
import { PageShell } from '../../components/layout/PageShell';
import { DETECTIVE_CASES } from '../../data/questionWords/cases';
import { WORD_IDS, type WordId } from '../../data/questionWords/types';
import { lemma, mixupSummary } from './copy';
import type { DetectiveStoreV1 } from './detectiveStore';
import { ROUND_SIZE } from './engine';
import { parseMixupKey } from './judge';
import { RUNGS, type Rung } from './ladder';
import { IconChip, Rise } from './parts';
import { WORD_ICONS } from './wordIcons';

interface Props {
  store: DetectiveStoreV1;
  onToolkit: () => void;
  onAnswer: (filter: WordId[] | null) => void;
  onAsk: () => void;
  onCase: (id: string) => void;
  onTricky: () => void;
}

const RUNG_LABEL: Record<Rung, string> = { tap: 'Tap', type: 'Type', say: 'Say' };

export function HomeView({ store, onToolkit, onAnswer, onAsk, onCase, onTricky }: Props) {
  const mix = Object.entries(store.mixups)
    .map(([key, count]) => ({ key, count, parsed: parseMixupKey(key) }))
    .filter(m => m.parsed)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  const closed = DETECTIVE_CASES.filter(c => store.casesSolved.includes(c.id)).length;
  const nextCase = DETECTIVE_CASES.find(c => !store.casesSolved.includes(c.id)) ?? DETECTIVE_CASES[0];
  const allClosed = closed === DETECTIVE_CASES.length;

  return (
    <PageShell maxWidth="md" gap={24}>
      <Rise className="rounded-card border border-hairline bg-surface p-5 shadow-card sm:p-6">
        <p className="text-eyebrow uppercase text-action-text">Question Detective</p>
        <h2 className="mt-2 text-h2 text-ink">Which word finds the answer?</h2>
        <p className="mt-2 max-w-[52ch] text-body-base text-ink-muted">
          Every French question word asks for one kind of thing: a person, a place, a time. Solve short cases to learn which is which.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Stat role={closed > 0 ? 'progress' : 'neutral'} soft={closed > 0} icon={<Check size={14} />}>
            {closed} of {DETECTIVE_CASES.length} cases closed
          </Stat>
          {store.bests.answer > 0 && <Stat>Best round {store.bests.answer} of {ROUND_SIZE}</Stat>}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="primary" size="lg" onClick={() => onCase(nextCase.id)} data-testid="detective-hero-case">
            <FolderSearch size={16} aria-hidden="true" />
            {allClosed ? 'Play a case again' : closed === 0 ? 'Start your first case' : 'Open the next case'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => onAnswer(null)}>
            <MessagesSquare size={16} aria-hidden="true" /> Quick round
          </Button>
        </div>
      </Rise>

      {mix.length > 0 && mix[0].parsed && (
        <Rise className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <IconChip icon={<Shuffle size={16} />} tone="info" />
            <div>
              <p className="text-section text-ink">Your mix-ups</p>
              <p className="mt-1 text-body-s text-ink-muted">{mixupSummary(mix[0].parsed.expected, mix[0].parsed.given)}</p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={onTricky}>Practise those two</Button>
        </Rise>
      )}

      <Section title="Case files" note="Each case is a chain of questions. Every clue tells you what to ask next.">
        <ul className="flex flex-col gap-2">
          {DETECTIVE_CASES.map((c, i) => {
            const isClosed = store.casesSolved.includes(c.id);
            return (
              <li key={c.id}>
                <Card interactive onClick={() => onCase(c.id)}>
                  <div className="flex items-center gap-3">
                    <IconChip icon={isClosed ? <Check size={16} /> : <span className="font-numeral text-[14px]">{i + 1}</span>} tone={isClosed ? 'progress' : 'neutral'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-section text-ink">{c.title}</p>
                      <p className="text-body-s text-ink-muted">{c.mystery}</p>
                    </div>
                    {isClosed ? <Stat role="progress" soft>Closed</Stat> : <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-subtle" />}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Practise the words">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <li>
            <RoomCard icon={<BookOpen size={18} />} title="The toolkit" sub="Meet the eight tools" onClick={onToolkit} />
          </li>
          <li>
            <RoomCard icon={<MessagesSquare size={18} />} title="Answer it" sub={`A round of ${ROUND_SIZE} questions`} onClick={() => onAnswer(null)} />
          </li>
          <li>
            <RoomCard icon={<Search size={18} />} title="Ask it" sub="See an answer, build the question" onClick={onAsk} />
          </li>
        </ul>
      </Section>

      <Section title="Your tools" note="Each word climbs Tap, then Type, then Say. Three right in a row climbs.">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WORD_IDS.map(id => {
            const Icon = WORD_ICONS[id];
            const rung = store.rungs[id]?.rung ?? 'tap';
            return (
              <li key={id} className="rounded-card border border-hairline bg-surface p-3">
                <p className="flex items-center gap-2 text-section text-ink">
                  <Icon size={16} aria-hidden="true" className="text-action-text" />
                  <span lang="fr">{lemma(id)}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex gap-1" aria-hidden="true">
                    {RUNGS.map((r, n) => (
                      <span key={r} className={`h-1.5 w-5 rounded-pill ${n <= RUNGS.indexOf(rung) ? 'bg-progress' : 'bg-track'}`} />
                    ))}
                  </span>
                  <span className="text-caption text-ink-muted">{RUNG_LABEL[rung]}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
    </PageShell>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Rise>
      <h3 className="text-subtitle text-ink">{title}</h3>
      {note && <p className="mt-1 text-body-s text-ink-muted">{note}</p>}
      <div className="mt-3">{children}</div>
    </Rise>
  );
}

function RoomCard({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <Card interactive onClick={onClick} className="h-full">
      <div className="flex flex-col gap-3">
        <IconChip icon={icon} />
        <div>
          <p className="text-section text-ink">{title}</p>
          <p className="text-body-s text-ink-muted">{sub}</p>
        </div>
      </div>
    </Card>
  );
}
