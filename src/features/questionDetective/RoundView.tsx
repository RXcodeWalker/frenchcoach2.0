import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { useSfxOnChange } from '../../services/sound/useSfx';
import { useAuth } from '../../context/AuthContext';
import type { WordId } from '../../data/questionWords/types';
import { hintFor, lemma, verdictLine } from './copy';
import type { RoundPlan } from './engine';
import { judgeAnswer, mixupKey, type Judgement } from './judge';
import { applyLadderResult, rungOf, type LadderMap, type Rung } from './ladder';
import { HearPrompt } from './HearPrompt';
import { PromptLine } from './PromptLine';
import { SpeakControl } from './SpeakControl';
import { sttIsSupported } from './stt';
import { WORD_ICONS } from './wordIcons';

export interface RoundLog {
  wordId: WordId;
  judgement: Judgement;
}

interface Props {
  plan: RoundPlan;
  ladder: LadderMap;
  onFinish: (log: RoundLog[], ladder: LadderMap) => void;
}

export function RoundView({ plan, ladder, onFinish }: Props) {
  const { consentStatus } = useAuth();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [hint, setHint] = useState(0);
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [log, setLog] = useState<RoundLog[]>([]);
  const [liveLadder, setLiveLadder] = useState(ladder);

  const item = plan.items[index];
  const sfx = judgement?.verdict === 'right' ? 'correct' : judgement?.verdict === 'almost' ? 'almost' : judgement ? 'wrong' : null;
  useSfxOnChange(sfx, judgement);

  if (!item) return null;

  const storedRung = rungOf(liveLadder, item.question.wordId);
  const speakOk = sttIsSupported() && consentStatus !== 'pending';
  const mode: Rung = storedRung === 'say' && !speakOk ? 'type' : storedRung;
  const Icon = WORD_ICONS[item.question.wordId];

  const commit = (input: string) => {
    if (judgement) return;
    const result = judgeAnswer(input, item.question);
    setJudgement(result);
    const right = result.verdict === 'right';
    setLiveLadder(prev => applyLadderResult(prev, item.question.wordId, right));
    setLog(prev => [...prev, { wordId: item.question.wordId, judgement: result }]);
  };

  const goNext = () => {
    if (index + 1 >= plan.items.length) onFinish(log, liveLadder);
    else {
      setIndex(index + 1);
      setTyped('');
      setHint(0);
      setJudgement(null);
    }
  };

  return (
    <PageShell maxWidth="sm">
      <p className="text-label text-ink-muted">{index + 1} of {plan.items.length}</p>
      <PromptLine prompt={item.question.prompt} wordId={item.question.wordId} />
      <p className="text-label text-ink-muted">{item.question.gloss}</p>
      <div className="flex flex-wrap items-center gap-2">
        <HearPrompt text={item.question.prompt} />
        <Button type="button" variant="quiet" size="sm" onClick={() => setHint(h => Math.min(2, h + 1))} disabled={hint >= 2}>
          <Search size={14} aria-hidden="true" /> Hint
        </Button>
      </div>
      {hint >= 1 && (
        <p className="flex items-center gap-2 text-label text-action-text" data-testid="detective-hint-1">
          <Icon size={16} aria-hidden="true" /> {lemma(item.question.wordId)}
        </p>
      )}
      {hint >= 2 && (
        <p className="text-label text-info-text" data-testid="detective-hint-2">{hintFor(item.question.wordId)}</p>
      )}

      {storedRung === 'say' && !speakOk && (
        <p className="text-label text-ink-muted">
          {consentStatus === 'pending' ? 'Waiting for a parent before the microphone. Type this one.' : 'This browser cannot hear you, so type the answer.'}
        </p>
      )}

      {!judgement && mode === 'tap' && (
        <ul className="flex flex-col gap-2">
          {item.choices.map(choice => (
            <li key={choice}>
              <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => commit(choice)}>
                <span lang="fr">{choice}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!judgement && mode === 'type' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            commit(typed);
          }}
        >
          <label className="text-label text-ink-muted" htmlFor="detective-type">Your answer, in one to three words</label>
          <input
            id="detective-type"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            lang="fr"
            autoComplete="off"
            className="h-12 rounded-control border border-hairline-strong bg-surface px-3 text-[16px] text-ink"
          />
          <Button type="submit" variant="primary" size="lg" disabled={!typed.trim()}>Check</Button>
        </form>
      )}

      {!judgement && mode === 'say' && <SpeakControl onHeard={commit} />}

      {judgement && (
        <div className="flex flex-col gap-3 rounded-card border border-hairline surface p-4" data-testid={`detective-verdict-${judgement.verdict}`}>
          <p className={`text-label ${judgement.verdict === 'right' ? 'text-progress-text' : judgement.verdict === 'almost' ? 'text-info-text' : 'text-correction-text'}`}>
            {verdictLine(judgement.verdict, judgement.expected, item.question.wordId, judgement.givenWord)}
          </p>
          {judgement.verdict === 'mixup' && judgement.givenWord && (
            <p className="sr-only">{mixupKey(item.question.wordId, judgement.givenWord)}</p>
          )}
          <Button type="button" variant="primary" size="lg" onClick={goNext} data-shortcut="continue">
            {index + 1 >= plan.items.length ? 'See results' : 'Next'}
          </Button>
        </div>
      )}
    </PageShell>
  );
}
