import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CloudOff, Trash2 } from 'lucide-react';
import { PlayButton } from '../../components/ui/PlayButton';
import { playBlob } from '../../services/audio/playBlob';
import { TopContextBar } from '../../components/TopContextBar';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { TOPICS } from '../../data/topics';
import { useOnlineStatus } from '../../pwa/useOnlineStatus';
import { useSavedAnswers, useSavedAnswerScope } from '../../features/learn/savedAnswers/useSavedAnswers';
import { processSavedAnswers } from '../../features/learn/savedAnswers/processSavedAnswers';
import { savedAnswerLink } from '../../features/learn/savedAnswers/savedAnswerLink';
import { deleteSavedAnswer, savedAnswerBlob, type SavedAnswer } from '../../services/offline/savedAnswers';
import { FeedbackExperience } from '../../features/feedback';
import { LearnExaminerFeedback } from '../../features/feedback/teacher/LearnExaminerFeedback';
import { getQuestionById } from '../../data/gameData';

function topicLabel(key: string): string {
  return TOPICS.find((t) => t.key === key)?.labelEn ?? key;
}

function recordedLabel(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${time}`;
}

/**
 * `/learn/saved` — Learn answers recorded with no connection (offline support).
 * Back online they are uploaded and transcribed automatically; feedback waits
 * for "Get feedback", which opens the answer in Learn and marks it there
 * exactly like an answer given online (it uses one of the day's answers).
 * A marked answer keeps its feedback: "See feedback" shows it again here with
 * no AI call, so it never spends another of the day's answers (owner, 2026-11-06).
 */
export function SavedAnswers() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const scope = useSavedAnswerScope();
  const { items, loaded } = useSavedAnswers();
  const [checking, setChecking] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const waiting = items.filter((a) => a.status === 'waiting').length;
  const viewing = items.find((a) => a.id === viewingId && a.status === 'marked' && a.marked) ?? null;

  if (viewing) {
    return (
      <MarkedFeedbackView
        item={viewing}
        onBack={() => setViewingId(null)}
        onAgain={() => navigate(savedAnswerLink(viewing.id, true))}
      />
    );
  }

  const checkNow = () => {
    setChecking(true);
    void processSavedAnswers(scope).finally(() => setChecking(false));
  };

  return (
    <>
      <TopContextBar title="Saved answers" subtitle="Recorded without a connection" showBack onBack={() => navigate('/learn')} backLabel="Learn" />
      <PageShell maxWidth="sm" gap={16}>
        <p className="text-body-s text-ink-muted">
          Answers you record in Learn while you’re offline wait here. When you’re back online we check what you said, then
          you choose when to get feedback. Getting feedback uses one of today’s marked answers; reading it again later is free.
        </p>

        {online && waiting > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-card surface p-4">
            <p className="text-body-s text-ink">
              {waiting === 1 ? '1 answer hasn’t' : `${waiting} answers haven’t`} been checked yet.
            </p>
            <Button size="sm" variant="secondary" onClick={checkNow} loading={checking} disabled={checking}>
              Check now
            </Button>
          </div>
        )}

        {loaded && items.length === 0 && (
          <div className="flex flex-col gap-2 rounded-card surface p-4" data-testid="saved-answers-empty">
            <p className="text-body-base text-ink">No saved answers.</p>
            <p className="text-body-s text-ink-muted">
              If you lose your connection during a Learn session, keep going — your answers are kept here until you’re back online.
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <SavedAnswerCard
              key={item.id}
              item={item}
              online={online}
              onFeedback={() => navigate(savedAnswerLink(item.id))}
              onSeeFeedback={() => setViewingId(item.id)}
            />
          ))}
        </ul>
      </PageShell>
    </>
  );
}

function SavedAnswerCard({ item, online, onFeedback, onSeeFeedback }: {
  item: SavedAnswer;
  online: boolean;
  onFeedback: () => void;
  onSeeFeedback: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-card surface p-4" data-testid="saved-answer">
      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink-subtle">
          {topicLabel(item.topicKey)} · {recordedLabel(item.recordedAt)}
        </span>
        <p className="text-[15px] font-semibold leading-snug text-ink">{item.questionText}</p>
      </div>

      {(item.status === 'ready' || item.status === 'marked') && item.transcript && (
        <p className="rounded-control bg-surface-recessed p-3 text-body-s text-ink">
          <span className="text-ink-muted">We heard: </span>« {item.transcript} »
        </p>
      )}
      {item.status === 'waiting' && (
        <p className="flex items-center gap-2 text-body-s text-ink-muted">
          <CloudOff size={14} aria-hidden="true" />
          {online ? 'Waiting to be checked.' : 'Waiting for a connection.'}
        </p>
      )}
      {item.status === 'marked' && (
        <p className="flex items-center gap-2 text-body-s text-progress-text">
          <CheckCircle2 size={14} aria-hidden="true" />
          Marked{item.markedAt ? ` ${recordedLabel(item.markedAt).toLowerCase()}` : ''} — reading the feedback again is free.
        </p>
      )}
      {item.status === 'unclear' && (
        <p className="text-body-s text-correction-text">
          We couldn’t hear any French in this recording. Listen back, then delete it and answer the question again in Learn.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {item.status === 'ready' && (
          <Button size="sm" onClick={onFeedback} disabled={!online}>
            Get feedback
          </Button>
        )}
        {item.status === 'marked' && item.marked && (
          <Button size="sm" onClick={onSeeFeedback} data-testid="see-feedback">
            See feedback
          </Button>
        )}
        <ListenButton item={item} />
        <Button size="sm" variant="quiet" onClick={() => void deleteSavedAnswer(item.id)} aria-label="Delete this saved answer">
          <span className="flex items-center gap-1.5"><Trash2 size={14} aria-hidden="true" /> Delete</span>
        </Button>
      </div>
    </li>
  );
}

/** ▶ Listen to the saved recording; tapping again pauses, ↺ starts it over. */
function ListenButton({ item }: { item: SavedAnswer }) {
  return <PlayButton label="Listen" play={() => playBlob(savedAnswerBlob(item))} />;
}

/**
 * A marked saved answer's stored feedback, read-only: nothing is sent, charged
 * or recorded again. "Get new feedback" is a real attempt and goes through Learn.
 */
function MarkedFeedbackView({ item, onBack, onAgain }: { item: SavedAnswer; onBack: () => void; onAgain: () => void }) {
  const question = getQuestionById(item.questionId);
  const transcript = item.transcript ?? '';
  return (
    <>
      <TopContextBar title="Your feedback" subtitle={item.questionText} showBack onBack={onBack} backLabel="Saved answers" />
      <PageShell maxWidth="sm" gap={16}>
        <p className="text-body-s text-ink-muted" data-testid="stored-feedback-note">
          This is the feedback you got{item.markedAt ? ` ${recordedLabel(item.markedAt).toLowerCase()}` : ''}. Reading it again is free —
          “Get new feedback” marks it afresh and uses one of today’s answers.
        </p>
        {item.marked?.style === 'coach' ? (
          <FeedbackExperience
            feedback={item.marked.feedback}
            transcript={transcript}
            modelAnswer={question?.modelAnswer}
            demands={question?.demands}
            onRetry={onAgain}
            onComplete={onBack}
          />
        ) : item.marked?.style === 'examiner' ? (
          <>
            <LearnExaminerFeedback
              status="done"
              result={item.marked.result}
              onSwitchToCoach={onAgain}
              onRetry={onAgain}
              transcript={transcript}
              demands={question?.demands}
            />
            <div className="flex flex-col gap-2">
              <Button size="lg" className="w-full" onClick={onBack}>Back to saved answers</Button>
              <Button size="lg" variant="secondary" className="w-full" onClick={onAgain}>Get new feedback</Button>
            </div>
          </>
        ) : null}
      </PageShell>
    </>
  );
}
