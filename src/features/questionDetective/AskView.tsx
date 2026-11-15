import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { useSfxOnChange } from '../../services/sound/useSfx';
import type { WordId } from '../../data/questionWords/types';
import { pickAskItem, tilesMatch, type AskItem } from './askEngine';
import { lemma, mixupLine } from './copy';
import { HearPrompt } from './HearPrompt';
import { FeedbackPanel, IconChip, Rise, StepTrack } from './parts';
import { WORD_ICONS } from './wordIcons';
import { mulberry32 } from './rng';

interface Props {
  seed: number;
  size?: number;
  onFinish: (correct: number, total: number) => void;
}

type Step = 'word' | 'tiles';

/**
 * Ask it (question-detective §4): you are shown an answer, pick the tool that
 * would get it, then build the question from word tiles.
 */
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
  const last = seen + 1 >= size;
  const settled = wordRight === false || tileRight !== null;

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
    if (last) {
      onFinish(correct, size);
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
    setSeen(seen + 1);
  };

  return (
    <PageShell maxWidth="sm" gap={16}>
      <Rise className="flex flex-col gap-2">
        <StepTrack total={size} done={seen + (settled ? 1 : 0)} current label="Round progress" />
        <p className="text-label text-ink-muted">Question {seen + 1} of {size}</p>
      </Rise>

      <Rise key={seen} className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div>
          <p className="text-eyebrow uppercase text-ink-subtle">Someone gave this answer</p>
          <p lang="fr" className="mt-2 text-title text-ink">{item.question.model}</p>
          <p className="mt-1 text-body-s text-ink-muted">{item.question.gloss}</p>
        </div>

        <div className="flex items-center gap-2 text-label text-ink-muted">
          <span className={step === 'word' ? 'text-action-text' : 'text-progress-text'}>1 Pick the tool</span>
          <span aria-hidden="true" className="text-ink-subtle">/</span>
          <span className={step === 'tiles' ? 'text-action-text' : ''}>2 Build the question</span>
        </div>

        {step === 'word' && (
          <div className="flex flex-col gap-3">
            <p className="text-section text-ink">Which question word would get that answer?</p>
            <ul className="grid grid-cols-2 gap-2">
              {item.wordChoices.map(id => {
                const WordIcon = WORD_ICONS[id];
                return (
                  <li key={id}>
                    <Button type="button" variant="secondary" size="lg" className="w-full" disabled={wordRight !== null} onClick={() => chooseWord(id)}>
                      <WordIcon size={16} aria-hidden="true" /> <span lang="fr">{lemma(id)}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
            {wordRight === false && picked && (
              <div className="flex flex-col gap-3">
                <FeedbackPanel tone="wrong" title="Not that tool">
                  {mixupLine(item.question.wordId, picked)}
                </FeedbackPanel>
                <div className="flex flex-wrap items-center gap-2">
                  <p lang="fr" className="text-body-s text-ink">The question was « {item.question.prompt} »</p>
                  <HearPrompt text={item.question.prompt} label="Hear the question" />
                </div>
                <Button type="button" variant="primary" size="lg" onClick={next} data-shortcut="continue">
                  {last ? 'See results' : 'Next'} <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'tiles' && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-section text-ink">
              <IconChip icon={<Icon size={16} />} />
              Build the question with « {lemma(item.question.wordId)} »
            </p>
            <div
              className="flex min-h-14 flex-wrap items-center gap-2 rounded-card border border-dashed border-hairline-strong bg-surface-recessed p-2"
              aria-label="Your question"
              role="group"
            >
              {placed.length === 0 && <span className="px-2 text-body-s text-ink-subtle">Tap the words in order</span>}
              {placed.map((tile, i) => (
                <button
                  key={`p-${i}-${tile}`}
                  type="button"
                  lang="fr"
                  onClick={() => unplace(i)}
                  disabled={tileRight !== null}
                  className="h-11 rounded-control border border-action bg-action-soft px-4 text-[16px] font-semibold text-action-text transition-colors duration-state ease-smooth active:scale-[.97] active:duration-press"
                >
                  {tile}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Word bank">
              {bank.map((tile, i) => (
                <button
                  key={`b-${i}-${tile}`}
                  type="button"
                  lang="fr"
                  onClick={() => place(tile, i)}
                  disabled={tileRight !== null}
                  className="h-11 rounded-control border border-hairline-strong bg-surface px-4 text-[16px] font-semibold text-ink transition-colors duration-state ease-smooth hover:bg-track active:scale-[.97] active:duration-press"
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
              <div className="flex flex-col gap-3">
                <FeedbackPanel
                  tone={tileRight ? 'right' : 'wrong'}
                  title={tileRight ? 'That is the question' : 'Not quite'}
                >
                  {!tileRight && <span lang="fr">The question is « {item.question.prompt} »</span>}
                </FeedbackPanel>
                <div className="-ml-3">
                  <HearPrompt text={item.question.prompt} label="Hear the question" />
                </div>
                <Button type="button" variant="primary" size="lg" onClick={next} data-shortcut="continue">
                  {last ? 'See results' : 'Next'} <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Rise>
    </PageShell>
  );
}
