import { PlayIconButton } from '../../../components/ui/PlayButton';
import { playBlob } from '../../../services/audio/playBlob';
import type { SegmentTurn } from './segmentPrompts';
import type { TurnAnswer } from './segments/SegmentTurns';

interface Props {
  turns: readonly SegmentTurn[];
  answers: readonly TurnAnswer[];
}

/** Each prompt with what the learner said (▶ their own recording, local only) beside a model answer (daily-news §3). */
export function YourAnswers({ turns, answers }: Props) {
  return (
    <ol className="flex flex-col gap-4" data-testid="news-your-answers">
      {turns.map((t, i) => {
        const a = answers[i];
        return (
          <li key={t.key} className="flex flex-col gap-2">
            <p className="text-eyebrow uppercase text-ink-subtle">{t.eyebrow}</p>
            <p lang="fr" className="text-label text-ink">{t.fr}</p>
            <div className="flex items-start gap-2 rounded-control bg-surface-recessed p-3">
              {a?.blob && <PlayIconButton play={() => playBlob(a.blob!)} label="Hear your answer" size={14} className="mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-subtle">You said</p>
                {a?.text ? (
                  <p lang="fr" className="text-body-s text-ink">« {a.text} »</p>
                ) : (
                  <p className="text-body-s text-ink-muted">Skipped</p>
                )}
              </div>
            </div>
            <div className="rounded-control border border-hairline p-3">
              <p className="text-caption text-ink-subtle">A model answer</p>
              <p lang="fr" className="text-body-s text-ink">{t.model}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
