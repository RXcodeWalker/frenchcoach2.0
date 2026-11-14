import { BookOpen, FolderSearch, MessagesSquare, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { DETECTIVE_CASES } from '../../data/questionWords/cases';
import type { WordId } from '../../data/questionWords/types';
import { lemma, mixupSummary } from './copy';
import { parseMixupKey } from './judge';
import { WORD_ICONS } from './wordIcons';
import type { DetectiveStoreV1 } from './detectiveStore';

interface Props {
  store: DetectiveStoreV1;
  onToolkit: () => void;
  onAnswer: (filter: WordId[] | null) => void;
  onAsk: () => void;
  onCase: (id: string) => void;
  onTricky: () => void;
}

export function HomeView({ store, onToolkit, onAnswer, onAsk, onCase, onTricky }: Props) {
  const mix = Object.entries(store.mixups)
    .map(([key, count]) => ({ key, count, parsed: parseMixupKey(key) }))
    .filter(m => m.parsed)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  return (
    <PageShell maxWidth="md">
      <p className="text-label text-ink-muted">
        Each French question word finds one kind of thing. Answer in one to three words.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RoomButton icon={BookOpen} title="The toolkit" sub="Meet the eight tools" onClick={onToolkit} />
        <RoomButton icon={MessagesSquare} title="Answer it" sub="A short round of questions" onClick={() => onAnswer(null)} />
        <RoomButton icon={Search} title="Ask it" sub="Pick the tool, then build the question" onClick={onAsk} />
        <RoomButton icon={FolderSearch} title="Case files" sub="Solve a short mystery" onClick={() => onCase(DETECTIVE_CASES[0].id)} />
      </div>

      {mix.length > 0 && mix[0].parsed && (
        <div className="rounded-card border border-hairline surface p-4">
          <p className="text-subtitle text-ink">Your mix-ups</p>
          <p className="mt-1 text-label text-ink-muted">{mixupSummary(mix[0].parsed.expected, mix[0].parsed.given)}</p>
          <Button type="button" variant="secondary" className="mt-3" onClick={onTricky}>Practise those two</Button>
        </div>
      )}

      <div>
        <p className="text-subtitle text-ink">Case files</p>
        <ul className="mt-2 flex flex-col gap-2">
          {DETECTIVE_CASES.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onCase(c.id)}
                className="flex w-full items-center justify-between rounded-card border border-hairline surface px-4 py-3 text-left hover:bg-track"
              >
                <span>
                  <span className="block text-label text-ink">{c.title}</span>
                  <span className="block text-label text-ink-muted">{c.mystery}</span>
                </span>
                {store.casesSolved.includes(c.id) && (
                  <span className="text-label text-progress-text">Closed</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-subtitle text-ink">Your tools</p>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(WORD_ICONS) as WordId[]).map(id => {
            const Icon = WORD_ICONS[id];
            const rung = store.rungs[id]?.rung ?? 'tap';
            return (
              <li key={id} className="rounded-card border border-hairline surface p-3">
                <p className="flex items-center gap-2 text-label text-ink">
                  <Icon size={16} aria-hidden="true" />
                  <span lang="fr">{lemma(id)}</span>
                </p>
                <p className="text-label text-ink-muted">{rung === 'tap' ? 'Tap' : rung === 'type' ? 'Type' : 'Say'}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </PageShell>
  );
}

function RoomButton({
  icon: Icon,
  title,
  sub,
  onClick,
}: {
  icon: typeof Search;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-card border border-hairline surface p-4 text-left hover:bg-track"
    >
      <Icon size={20} className="mt-0.5 text-action-text" aria-hidden="true" />
      <span>
        <span className="block text-subtitle text-ink">{title}</span>
        <span className="block text-label text-ink-muted">{sub}</span>
      </span>
    </button>
  );
}
