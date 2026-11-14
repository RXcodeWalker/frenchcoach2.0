import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { useSfxOnChange } from '../../services/sound/useSfx';
import type { DetectiveCase } from '../../data/questionWords/cases';
import { WORD_IDS, type WordId } from '../../data/questionWords/types';
import {
  answerClosing,
  askWitness,
  currentClosing,
  currentWitness,
  skipWitness,
  startCase,
  type CaseState,
} from './caseEngine';
import { lemma, verdictLine } from './copy';
import { HearPrompt } from './HearPrompt';
import { PromptLine } from './PromptLine';
import { WORD_ICONS } from './wordIcons';

interface Props {
  file: DetectiveCase;
  onFinish: (solved: boolean) => void;
}

export function CaseView({ file, onFinish }: Props) {
  const [state, setState] = useState<CaseState>(startCase);
  const [typed, setTyped] = useState('');
  const witness = currentWitness(file, state);
  const closing = currentClosing(file, state);

  const cue = state.lastReply?.kind === 'clue' || state.lastClosing?.verdict === 'right' || state.lastClosing?.verdict === 'almost'
    ? 'correct'
    : state.lastReply?.kind === 'wrong' || state.lastClosing
      ? 'wrong'
      : null;
  useSfxOnChange(cue, state.lastReply ?? state.lastClosing ?? state.phase);

  const ask = (id: WordId) => setState(s => askWitness(file, s, id));

  const submitClosing = () => {
    if (!typed.trim()) return;
    setState(s => answerClosing(file, s, typed));
    setTyped('');
  };

  return (
    <PageShell maxWidth="sm">
      <h2 className="text-title text-ink">{file.title}</h2>
      <p className="text-label text-ink-muted">{file.mystery}</p>

      {state.clues.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-card border border-hairline surface p-3">
          {state.clues.map(clue => (
            <li key={clue} lang="fr" className="text-label text-ink">{clue}</li>
          ))}
        </ul>
      )}

      {state.phase === 'question' && witness && (
        <div className="flex flex-col gap-3">
          <p className="text-subtitle text-ink">Ask {witness.name}</p>
          <ul className="grid grid-cols-2 gap-2">
            {WORD_IDS.map(id => {
              const Icon = WORD_ICONS[id];
              return (
                <li key={id}>
                  <Button type="button" variant="secondary" size="md" className="w-full" onClick={() => ask(id)}>
                    <Icon size={16} aria-hidden="true" /> {lemma(id)}
                  </Button>
                </li>
              );
            })}
          </ul>
          {state.lastReply && (
            <div className={`rounded-card border border-hairline p-4 ${state.lastReply.kind === 'clue' ? 'bg-progress-soft' : 'surface'}`}>
              <p lang="fr" className="text-label text-ink">{state.lastReply.text}</p>
              {state.lastReply.kind === 'wrong' && (
                <p className="mt-2 text-label text-ink-muted">{lemma(state.lastReply.wordId)} finds something else. Try another tool.</p>
              )}
            </div>
          )}
          <Button type="button" variant="quiet" onClick={() => setState(s => skipWitness(file, s))}>Skip this witness</Button>
        </div>
      )}

      {state.phase === 'closing' && closing && (
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (state.lastClosing) {
              setState(s => ({ ...s, lastClosing: null }));
              return;
            }
            submitClosing();
          }}
        >
          <p className="text-label text-ink-muted">Close the case</p>
          <PromptLine prompt={closing.prompt} wordId={closing.wordId} />
          <p className="text-label text-ink-muted">{closing.gloss}</p>
          <HearPrompt text={closing.prompt} />
          {!state.lastClosing && (
            <>
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                lang="fr"
                autoComplete="off"
                className="h-12 rounded-control border border-hairline-strong bg-surface px-3 text-[16px] text-ink"
              />
              <Button type="submit" variant="primary" size="lg" disabled={!typed.trim()}>Check</Button>
            </>
          )}
          {state.lastClosing && (
            <div className="flex flex-col gap-2">
              <p className={`text-label ${state.lastClosing.verdict === 'right' || state.lastClosing.verdict === 'almost' ? 'text-progress-text' : 'text-correction-text'}`}>
                {verdictLine(state.lastClosing.verdict, state.lastClosing.expected, closing.wordId, state.lastClosing.givenWord)}
              </p>
              <Button type="submit" variant="primary">Next</Button>
            </div>
          )}
        </form>
      )}

      {state.phase === 'done' && (
        <div className="flex flex-col gap-3 rounded-card border border-hairline surface p-4">
          <p className="text-subtitle text-ink">{state.solved ? 'Case closed.' : 'The case is still open — try again another time.'}</p>
          <Button type="button" variant="primary" size="lg" onClick={() => onFinish(state.solved)}>Back to the desk</Button>
        </div>
      )}
    </PageShell>
  );
}
