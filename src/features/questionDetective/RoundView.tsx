import { useState } from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { PageShell } from '../../components/layout/PageShell';
import { useSfxOnChange } from '../../services/sound/useSfx';
import { useAuth } from '../../context/AuthContext';
import type { WordId } from '../../data/questionWords/types';
import { hintFor, lemma, verdictLine } from './copy';
import type { RoundPlan } from './engine';
import { judgeAnswer, mixupKey, type Judgement } from './judge';
import { applyLadderResult, rungOf, type LadderMap, type Rung } from './ladder';
import { HearPrompt } from './HearPrompt';
import { FeedbackPanel, Rise, StepTrack } from './parts';
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

const MODE_LABEL: Record<Rung, string> = { tap: 'Tap the answer', type: 'Type the answer', say: 'Say the answer' };

const VERDICT_TITLE: Record<Judgement['verdict'], string> = {
  right: 'Right',
  almost: 'Almost',
  mixup: 'A mix-up',
  miss: 'Not quite',
};

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
  const last = index + 1 >= plan.items.length;

  const commit = (input: string) => {
    if (judgement) return;
    const result = judgeAnswer(input, item.question);
    setJudgement(result);
    const right = result.verdict === 'right';
    setLiveLadder(prev => applyLadderResult(prev, item.question.wordId, right));
    setLog(prev => [...prev, { wordId: item.question.wordId, judgement: result }]);
  };

  const goNext = () => {
    if (last) onFinish(log, liveLadder);
    else {
      setIndex(index + 1);
      setTyped('');
      setHint(0);
      setJudgement(null);
    }
  };

  return (
    <PageShell maxWidth="sm" gap={16}>
      <Rise className="flex flex-col gap-2">
        <StepTrack total={plan.items.length} done={index + (judgement ? 1 : 0)} current label="Round progress" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-label text-ink-muted">Question {index + 1} of {plan.items.length}</p>
          <Stat>{MODE_LABEL[mode]}</Stat>
        </div>
      </Rise>

      <Rise key={index} className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div>
          <p className="text-eyebrow uppercase text-ink-subtle">What would you answer?</p>
          <div className="mt-2">
            <PromptLine prompt={item.question.prompt} wordId={item.question.wordId} />
          </div>
          <p className="mt-1 text-body-s text-ink-muted">{item.question.gloss}</p>
        </div>

        <div className="-ml-3 flex flex-wrap items-center gap-1">
          <HearPrompt text={item.question.prompt} />
          <Button type="button" variant="quiet" size="sm" onClick={() => setHint(h => Math.min(2, h + 1))} disabled={hint >= 2 || judgement !== null}>
            <Lightbulb size={14} aria-hidden="true" /> {hint === 0 ? 'Hint' : 'Another hint'}
          </Button>
        </div>

        {hint >= 1 && (
          <p className="flex items-center gap-2 text-label text-action-text" data-testid="detective-hint-1">
            <Icon size={16} aria-hidden="true" /> {lemma(item.question.wordId)}
          </p>
        )}
        {hint >= 2 && (
          <p className="text-body-s text-info-text" data-testid="detective-hint-2">{hintFor(item.question.wordId)}</p>
        )}

        {storedRung === 'say' && !speakOk && (
          <p className="text-body-s text-ink-muted">
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
          <div className="flex flex-col gap-3">
            <FeedbackPanel
              tone={judgement.verdict === 'right' ? 'right' : judgement.verdict === 'almost' ? 'hint' : 'wrong'}
              title={VERDICT_TITLE[judgement.verdict]}
              testId={`detective-verdict-${judgement.verdict}`}
            >
              {verdictLine(judgement.verdict, judgement.expected, item.question.wordId, judgement.givenWord)}
              {judgement.verdict === 'mixup' && judgement.givenWord && (
                <span className="sr-only">{mixupKey(item.question.wordId, judgement.givenWord)}</span>
              )}
            </FeedbackPanel>
            <Button type="button" variant="primary" size="lg" onClick={goNext} data-shortcut="continue">
              {last ? 'See results' : 'Next'}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        )}
      </Rise>
    </PageShell>
  );
}
