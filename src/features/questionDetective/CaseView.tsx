import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, FileText, FolderSearch, Lightbulb, MessageCircle, RotateCcw, User, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { useSfxOnChange } from '../../services/sound/useSfx';
import { BLANK, fillQuestion, rightFill, type CaseStep, type DetectiveCase } from '../../data/questionWords/cases';
import type { WordId } from '../../data/questionWords/types';
import {
  answerClosing,
  askForHint,
  canRetryClosing,
  chooseTool,
  cluesFound,
  currentClosing,
  currentStep,
  hintVisible,
  nextClosing,
  nextStep,
  startCase,
  stepChoices,
  type CaseState,
} from './caseEngine';
import { finds, lemma, verdictLine } from './copy';
import { HearPrompt } from './HearPrompt';
import { FeedbackPanel, IconChip, Rise, StepTrack } from './parts';
import { PromptLine } from './PromptLine';
import { WORD_ICONS } from './wordIcons';

interface Props {
  file: DetectiveCase;
  /** The next case not yet closed, if any: offered once this one is closed. */
  next?: { title: string; onOpen: () => void } | null;
  /** Called once when the case is closed, so it is saved even if the learner goes straight to the next case. */
  onSolved: () => void;
  onFinish: () => void;
}

const FOCUS_ID = 'case-focus';
const FOCUS_CLASS = 'scroll-mt-24';

export function CaseView({ file, next, onSolved, onFinish }: Props) {
  const [state, setState] = useState<CaseState>(startCase);
  const [typed, setTyped] = useState('');
  const step = currentStep(file, state);
  const closing = currentClosing(file, state);
  const notes = cluesFound(file, state);

  const cue =
    state.phase === 'closing' && state.lastClosing
      ? state.lastClosing.verdict === 'right' || state.lastClosing.verdict === 'almost' ? 'correct' : 'wrong'
      : state.answered ? 'correct'
      : state.lastWrong ? 'wrong'
      : null;
  useSfxOnChange(cue, `${state.phase}:${state.stepIndex}:${state.tried.length}:${state.answered}:${state.closingIndex}:${state.closingTry}:${state.closingSettled}`);

  // Bring the card being worked on to the top, so the question is never left under the notes.
  useEffect(() => {
    if (state.phase === 'question' && state.stepIndex === 0) return;
    document.getElementById(FOCUS_ID)?.scrollIntoView?.({ block: 'start' });
  }, [state.phase, state.stepIndex, state.closingIndex]);

  const closed = state.phase === 'done' && state.solved;
  useEffect(() => {
    if (closed) onSolved();
    // onSolved is a fresh closure each render; closing the case is what triggers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  const total = file.steps.length + 1;
  const done = state.phase === 'done' ? total : state.phase === 'closing' ? file.steps.length : state.stepIndex + (state.answered ? 1 : 0);
  const where =
    state.phase === 'question' ? `Question ${state.stepIndex + 1} of ${file.steps.length}`
    : state.phase === 'closing' ? 'Case report'
    : state.solved ? 'Case closed' : 'Case open';

  const submitClosing = () => {
    if (!typed.trim()) return;
    setState(s => answerClosing(file, s, typed));
    setTyped('');
  };

  return (
    <PageShell maxWidth="sm" gap={16}>
      <Rise className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <IconChip icon={<FolderSearch size={18} />} size={40} />
          <div className="min-w-0">
            <p className="text-eyebrow uppercase text-ink-subtle">Case file</p>
            <h2 className="mt-1 text-title text-ink">{file.title}</h2>
            <p className="mt-1 text-body-s text-ink-muted">{file.mystery}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <StepTrack total={total} done={done} current={state.phase !== 'done'} label="Case progress" />
          <p className="text-label text-ink-muted" data-testid="case-where">{where}</p>
        </div>
      </Rise>

      {notes.length > 0 && <Notes notes={notes} />}

      {state.phase === 'question' && step && (
        <StepCard
          key={step.id}
          step={step}
          state={state}
          isLast={state.stepIndex + 1 >= file.steps.length}
          onTool={id => setState(s => chooseTool(file, s, id))}
          onHint={() => setState(s => askForHint(s))}
          onNext={() => setState(s => nextStep(file, s))}
        />
      )}

      {state.phase === 'closing' && closing && (
        <Rise id={FOCUS_ID} className={`${FOCUS_CLASS} rounded-card border border-hairline bg-surface p-5 shadow-card`} testId="case-report">
          <form
            className="flex flex-col gap-4"
            onSubmit={e => {
              e.preventDefault();
              if (state.closingSettled) {
                setState(s => nextClosing(file, s));
                return;
              }
              submitClosing();
            }}
          >
            <div>
              <p className="text-eyebrow uppercase text-ink-subtle">
                Write your report · {state.closingIndex + 1} of {file.closing.length}
              </p>
              <p className="mt-1 text-body-s text-ink-muted">Use your notes. Answer in one to three words.</p>
            </div>
            <div className="flex flex-col gap-1">
              <PromptLine prompt={closing.prompt} wordId={closing.wordId} />
              <p className="text-body-s text-ink-muted">{closing.gloss}</p>
              <div className="-ml-3">
                <HearPrompt text={closing.prompt} />
              </div>
            </div>

            {!state.closingSettled && (
              <>
                <input
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  lang="fr"
                  autoComplete="off"
                  aria-label="Your answer in French"
                  className="h-12 rounded-control border border-hairline-strong bg-surface px-3 text-[16px] text-ink"
                />
                {canRetryClosing(state) && state.lastClosing && (
                  <FeedbackPanel tone="hint" title="Not quite. Look at your notes and try once more." testId="case-retry" />
                )}
                <Button type="submit" variant="primary" size="lg" disabled={!typed.trim()}>
                  {canRetryClosing(state) ? 'Try again' : 'Check'}
                </Button>
              </>
            )}

            {state.closingSettled && state.lastClosing && (
              <>
                <FeedbackPanel
                  tone={state.lastClosing.verdict === 'right' || state.lastClosing.verdict === 'almost' ? 'right' : 'wrong'}
                  title={state.lastClosing.verdict === 'right' || state.lastClosing.verdict === 'almost' ? 'Good report.' : 'Not this time.'}
                  testId="case-closing-verdict"
                >
                  {verdictLine(state.lastClosing.verdict, state.lastClosing.expected, closing.wordId, state.lastClosing.givenWord)}
                </FeedbackPanel>
                <Button type="submit" variant="primary" size="lg" data-shortcut="continue">
                  {state.closingIndex + 1 >= file.closing.length ? 'Finish the case' : 'Next'}
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </>
            )}
          </form>
        </Rise>
      )}

      {state.phase === 'done' && (
        <Rise id={FOCUS_ID} className={`${FOCUS_CLASS} flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card`} testId="case-done">
          <div className="flex items-center gap-3">
            <IconChip icon={state.solved ? <FileText size={18} /> : <RotateCcw size={18} />} tone={state.solved ? 'progress' : 'neutral'} size={40} />
            <h2 className="text-title text-ink">{state.solved ? 'Case closed' : 'The case is still open'}</h2>
          </div>
          <p className="text-body-s text-ink-muted">
            {state.solved
              ? `You found every clue${state.firstTry === file.steps.length ? ' with the right tool each time' : ` and picked the right tool first time on ${state.firstTry} of ${file.steps.length}`}, and your report was right.`
              : 'Some report answers were missing. Read your notes, then try the case again.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {state.solved && next ? (
              <Button type="button" variant="primary" size="lg" onClick={next.onOpen} data-shortcut="continue">
                Next case: {next.title}
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            ) : (
              !state.solved && (
                <Button type="button" variant="primary" size="lg" onClick={() => { setState(startCase()); setTyped(''); }}>
                  <RotateCcw size={16} aria-hidden="true" /> Try again
                </Button>
              )
            )}
            <Button type="button" variant={state.solved && next ? 'secondary' : state.solved ? 'primary' : 'secondary'} size="lg" onClick={onFinish}>
              Back to the desk
            </Button>
          </div>
        </Rise>
      )}
    </PageShell>
  );
}

function Notes({ notes }: { notes: CaseStep[] }) {
  return (
    <Rise className="rounded-card border border-hairline bg-surface-recessed p-4" testId="case-notes">
      <div className="flex items-center gap-2">
        <IconChip icon={<FileText size={16} />} tone="neutral" />
        <p className="text-eyebrow uppercase text-ink-subtle">Your notes</p>
      </div>
      <ol className="mt-3 flex flex-col gap-3">
        {notes.map(n => (
          <li key={n.id} className="flex flex-col gap-0.5">
            <p className="text-caption text-ink-subtle">{n.name} said</p>
            <p lang="fr" className="text-body-s font-semibold text-ink">{n.clue}</p>
            <p className="text-caption text-ink-muted">{n.clueGloss}</p>
          </li>
        ))}
      </ol>
    </Rise>
  );
}

function Bubble({ who, name, tone = 'plain', children }: { who: 'you' | 'witness'; name: string; tone?: 'plain' | 'found'; children: ReactNode }) {
  const side = who === 'you' ? 'self-end' : 'self-start';
  const surface =
    tone === 'found' ? 'border-progress bg-progress-soft'
    : who === 'you' ? 'border-hairline bg-surface-recessed'
    : 'border-hairline bg-surface';
  return (
    <div className={`${side} flex max-w-[92%] flex-col gap-1 rounded-card border px-4 py-3 ${surface}`}>
      <p className="text-caption text-ink-subtle">{name}</p>
      {children}
    </div>
  );
}

function StepCard({
  step,
  state,
  isLast,
  onTool,
  onHint,
  onNext,
}: {
  step: CaseStep;
  state: CaseState;
  isLast: boolean;
  onTool: (id: WordId) => void;
  onHint: () => void;
  onNext: () => void;
}) {
  const [before, after] = step.question.split(BLANK);
  const word = rightFill(step, lemma(step.rightWord));
  const shown = before === '' ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  const showHint = hintVisible(state);
  const last = state.lastWrong;

  return (
    <Rise id={FOCUS_ID} className={`${FOCUS_CLASS} flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card`} testId="case-step">
      <div className="flex items-start gap-3">
        <IconChip icon={<User size={18} />} />
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-ink-subtle">Ask {step.name}</p>
          <p className="mt-1 text-subtitle text-ink" data-testid="case-goal">{step.goal}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Bubble who="you" name="You">
          <p lang="fr" className="text-title text-ink" data-testid="case-question">
            {before}
            {state.answered ? (
              <mark className="rounded-control bg-action-soft px-1 text-action-text">{shown}</mark>
            ) : (
              <span
                role="img"
                aria-label="blank: the question word goes here"
                className="mx-1 inline-block h-[1.1em] min-w-[3.5ch] translate-y-[0.2em] border-b-2 border-dashed border-hairline-strong"
              />
            )}
            {after}
          </p>
          {state.answered && <p className="text-body-s text-ink-muted">{step.questionGloss}</p>}
        </Bubble>

        {!state.answered && last && (
          <Bubble who="witness" name={step.name}>
            <p lang="fr" className="text-body-s font-semibold text-ink" data-testid="case-wrong-reply">{last.text}</p>
          </Bubble>
        )}

        {state.answered && (
          <Bubble who="witness" name={step.name} tone="found">
            <p lang="fr" className="text-subtitle text-ink" data-testid="case-clue">{step.clue}</p>
            <p className="text-body-s text-ink-muted">{step.clueGloss}</p>
          </Bubble>
        )}
      </div>

      {!state.answered && last && (
        <p className="flex items-start gap-2 text-body-s text-correction-text" data-testid="case-wrong">
          <X size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">« {lemma(last.wordId)} » finds {finds(last.wordId)}.</span>{' '}
            <span className="text-ink-muted">That is not what you need here. Try another tool.</span>
          </span>
        </p>
      )}

      {!state.answered && showHint && (
        <FeedbackPanel tone="hint" title={`You are looking for ${finds(step.rightWord)}.`} testId="case-hint" />
      )}

      {state.answered ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="primary" size="lg" onClick={onNext} data-shortcut="continue" className="sm:min-w-[200px]">
            {isLast ? 'Write the report' : 'Next witness'}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
          <HearPrompt text={fillQuestion(step, word)} label="Hear your question" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-label text-ink-muted">
              <MessageCircle size={14} aria-hidden="true" /> Which question word finds it?
            </p>
            {!showHint && (
              <Button type="button" variant="quiet" size="sm" onClick={onHint}>
                <Lightbulb size={14} aria-hidden="true" /> Hint
              </Button>
            )}
          </div>
          <ul className="grid grid-cols-2 gap-2" aria-label="Question words">
            {stepChoices(step).map(id => {
              const Icon = WORD_ICONS[id];
              const tried = state.tried.includes(id);
              return (
                <li key={id}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    disabled={tried}
                    aria-label={tried ? `${lemma(id)}, already tried` : lemma(id)}
                    onClick={() => onTool(id)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span lang="fr">{lemma(id)}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Rise>
  );
}
