import { useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { useSfxOnChange } from '../../services/sound/useSfx';
import type { WordId } from '../../data/questionWords/types';
import { pickAskItem, tilesMatch, type AskItem } from './askEngine';
import { lemma, mixupLine } from './copy';
import { HearPrompt } from './HearPrompt';
import { WORD_ICONS } from './wordIcons';
import { mulberry32 } from './rng';

interface Props {
  seed: number;
  size?: number;
  onFinish: (correct: number, total: number) => void;
}

type Step = 'word' | 'tiles' | 'done';

export function AskView({ seed, size = 6, onFinish }: Props) {
  const rand = useRef(mulberry32(seed)).current;
  const [avoid] = useState(() => new Set<string>());
  const [item, setItem] = useState<AskItem>(() => pickAskItem(rand, avoid));
  const [step, setStep] = useState<Step>('word');
  const [placed, setPlaced] = useState<string[]>([]);
  const [bank, setBank] = useState<string[]>(() => item.tiles);
  const [picked, setPicked] = useState<WordId | null>(null);
  const [wordRight, setWordRight] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [seen, setSeen] = useState(0);
  const [tileRight, setTileRight] = useState<boolean | null>(null);

  const cue = wordRight === false || tileRight === false ? 'wrong' : wordRight || tileRight ? 'correct' : null;
  useSfxOnChange(cue, `${seen}:${step}:${wordRight}:${tileRight}`);

  const Icon = WORD_ICONS[item.question.wordId];

  const chooseWord = (id: WordId) => {
    if (wordRight !== null) return;
    setPicked(id);
    const ok = id === item.question.wordId;
    setWordRight(ok);
    if (ok) setStep('tiles');
  };

  const place = (tile: string, from: number) => {
    if (tileRight !== null) return;
    setBank(b => b.filter((_, i) => i !== from));
    setPlaced(p => [...p, tile]);
  };

  const unplace = (from: number) => {
    if (tileRight !== null) return;
    const tile = placed[from];
    setPlaced(p => p.filter((_, i) => i !== from));
    setBank(b => [...b, tile]);
  };

  const checkTiles = () => {
    const ok = tilesMatch(placed, item.question.tiles);
    setTileRight(ok);
    setCorrect(c => c + (ok && wordRight ? 1 : 0));
  };

  const next = () => {
    const nextSeen = seen + 1;
    if (nextSeen >= size) {
      onFinish(correct + (tileRight && wordRight ? 0 : 0), size);
      return;
    }
    avoid.add(item.question.id);
    const nextItem = pickAskItem(rand, avoid);
    setItem(nextItem);
    setStep('word');
    setPlaced([]);
    setBank(nextItem.tiles);
    setPicked(null);
    setWordRight(null);
    setTileRight(null);
    setSeen(nextSeen);
  };

  const finish = () => onFinish(correct, size);

  return (
    <PageShell maxWidth="sm">
      <p className="text-label text-ink-muted">{seen + 1} of {size}</p>
      <p className="text-label text-ink-muted">This answer appeared:</p>
      <p lang="fr" className="text-title text-ink">{item.question.model}</p>
      <p className="text-label text-ink-muted">{item.question.gloss}</p>
      <HearPrompt text={item.question.prompt} label="Hear the question" />

      {step === 'word' && (
        <div className="flex flex-col gap-3">
          <p className="text-label text-ink">Which tool would get that answer?</p>
          <ul className="grid grid-cols-2 gap-2">
            {item.wordChoices.map(id => {
              const WordIcon = WORD_ICONS[id];
              return (
                <li key={id}>
                  <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => chooseWord(id)}>
                    <WordIcon size={16} aria-hidden="true" /> {lemma(id)}
                  </Button>
                </li>
              );
            })}
          </ul>
          {wordRight === false && picked && (
            <div className="flex flex-col gap-2 rounded-card border border-hairline surface p-4">
              <p className="text-label text-correction-text">{mixupLine(item.question.wordId, picked)}</p>
              <Button type="button" variant="primary" onClick={next}>Next</Button>
            </div>
          )}
        </div>
      )}

      {step === 'tiles' && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-label text-action-text">
            <Icon size={16} aria-hidden="true" /> Build the question
          </p>
          <div className="flex min-h-12 flex-wrap gap-2 rounded-card border border-dashed border-hairline-strong p-2">
            {placed.map((tile, i) => (
              <button
                key={`p-${i}-${tile}`}
                type="button"
                lang="fr"
                onClick={() => unplace(i)}
                className="h-12 rounded-control border border-action bg-action-soft px-4 text-[17px] font-semibold text-action-text"
              >
                {tile}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {bank.map((tile, i) => (
              <button
                key={`b-${i}-${tile}`}
                type="button"
                lang="fr"
                onClick={() => place(tile, i)}
                className="h-12 rounded-control border border-hairline-strong bg-surface px-4 text-[17px] font-semibold text-ink hover:bg-track"
              >
                {tile}
              </button>
            ))}
          </div>
          {tileRight === null && (
            <Button type="button" variant="primary" size="lg" disabled={placed.length !== item.question.tiles.length} onClick={checkTiles}>
              Check
            </Button>
          )}
          {tileRight !== null && (
            <div className="flex flex-col gap-2 rounded-card border border-hairline surface p-4">
              <p className={`text-label ${tileRight ? 'text-progress-text' : 'text-correction-text'}`}>
                {tileRight ? 'That’s the question.' : `The question is « ${item.question.prompt} »`}
              </p>
              <Button type="button" variant="primary" onClick={seen + 1 >= size ? finish : next}>
                {seen + 1 >= size ? 'See results' : 'Next'}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
