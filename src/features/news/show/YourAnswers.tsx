import { Check, Lightbulb } from 'lucide-react';
import { PlayIconButton } from '../../../components/ui/PlayButton';
import { playBlob } from '../../../services/audio/playBlob';
import { diffWords } from '../../../domain/learn/feedback/buildChanges';
import { FeedbackPointList } from '../../feedback/components/FeedbackPointList';
import type { SegmentTurn } from './segmentPrompts';
import type { TurnAnswer } from './segments/SegmentTurns';
import { answerChecks, applyFixes, type AnswerCheck, type Fix } from './answerReview';

interface Props {
  turns: readonly SegmentTurn[];
  answers: readonly TurnAnswer[];
  /** The feedback's fixes, placed under the answer each one quotes (answerReview.placeFixes). */
  fixesByAnswer?: readonly Fix[][];
}

function CheckRow({ check }: { check: AnswerCheck }) {
  return (
    <li className="flex items-start gap-2 text-body-s" data-testid={`news-check-${check.key}`} data-met={check.met}>
      {check.met ? (
        <Check size={16} className="mt-0.5 shrink-0 text-progress-text" aria-hidden="true" />
      ) : (
        <Lightbulb size={16} className="mt-0.5 shrink-0 text-info-text" aria-hidden="true" />
      )}
      <span className="min-w-0">
        <span className={check.met ? 'text-progress-text' : 'text-info-text'}>{check.label}</span>
        <span className="text-ink-muted"> · <span lang="fr">{check.detail}</span></span>
      </span>
    </li>
  );
}

/** "Say it better": this answer with its own fixes applied, the changed words in green. */
function SayItBetter({ answer, better }: { answer: string; better: string }) {
  const ops = diffWords(answer, better, { ignoreCaseAndPunctuation: true });
  return (
    <div className="rounded-control bg-info-soft p-3" data-testid="news-say-better">
      <p className="text-caption text-info-text">Say it better</p>
      <p lang="fr" className="text-body-s text-ink">
        {ops.map((op, i) =>
          op.type === 'equal' ? (
            <span key={i}>{op.afterText}</span>
          ) : op.type === 'delete' ? null : (
            <span key={i} className="font-semibold text-progress-text">{op.afterText}</span>
          ),
        )}
      </p>
    </div>
  );
}

/**
 * Answer by answer (daily-news §8): the prompt, what the learner said (▶ their
 * own recording, local only), the exam-habit checks, the fixes that quote this
 * answer, the answer with those fixes applied, and a model answer. No marks.
 */
export function YourAnswers({ turns, answers, fixesByAnswer }: Props) {
  return (
    <ol className="flex flex-col gap-6" data-testid="news-your-answers">
      {turns.map((t, i) => {
        const a = answers[i];
        const text = a?.text ?? '';
        const checks = answerChecks(t, text);
        const fixes = fixesByAnswer?.[i] ?? [];
        const better = text ? applyFixes(text, fixes) : null;
        return (
          <li key={t.key} className="flex flex-col gap-3 border-t border-hairline pt-5 first:border-t-0 first:pt-0" data-testid={`news-answer-${i}`}>
            <div>
              <p className="text-eyebrow uppercase text-ink-subtle">{t.eyebrow}</p>
              {t.goal ? <p className="mt-1 text-label text-ink">{t.goal}</p> : <p lang="fr" className="mt-1 text-label text-ink">{t.fr}</p>}
            </div>
            <div className="flex items-start gap-2 rounded-control bg-surface-recessed p-3">
              {a?.blob && <PlayIconButton play={() => playBlob(a.blob!)} label="Hear your answer" size={14} className="mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-subtle">{t.goal ? 'You asked' : 'You said'}</p>
                {text ? (
                  <p lang="fr" className="text-body-s text-ink">« {text} »</p>
                ) : (
                  <p className="text-body-s text-ink-muted">Skipped</p>
                )}
              </div>
            </div>
            {checks.length > 0 && (
              <ul className="flex flex-col gap-1.5" aria-label="Exam habits">
                {checks.map(c => <CheckRow key={c.key} check={c} />)}
              </ul>
            )}
            {fixes.length > 0 && (
              <div data-testid="news-answer-fixes">
                <FeedbackPointList groups={[{ heading: fixes.length > 1 ? 'Fix these' : 'Fix this', tone: 'bad', points: fixes }]} />
              </div>
            )}
            {better && <SayItBetter answer={text} better={better} />}
            <div className="rounded-control border border-hairline p-3">
              <p className="text-caption text-ink-subtle">{t.modelLabel ?? 'A model answer'}</p>
              <p lang="fr" className="text-body-s text-ink">{t.model}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
