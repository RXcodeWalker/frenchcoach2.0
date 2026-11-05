import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudOff, Pause, Play, Trash2 } from 'lucide-react';
import { TopContextBar } from '../../components/TopContextBar';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { TOPICS } from '../../data/topics';
import { useOnlineStatus } from '../../pwa/useOnlineStatus';
import { useSavedAnswers, useSavedAnswerScope } from '../../features/learn/savedAnswers/useSavedAnswers';
import { processSavedAnswers } from '../../features/learn/savedAnswers/processSavedAnswers';
import { SAVED_ANSWER_PARAM } from '../../features/learn/savedAnswers/savedAnswerLink';
import { deleteSavedAnswer, savedAnswerBlob, type SavedAnswer } from '../../services/offline/savedAnswers';

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
 */
export function SavedAnswers() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const scope = useSavedAnswerScope();
  const { items, loaded } = useSavedAnswers();
  const [checking, setChecking] = useState(false);
  const waiting = items.filter((a) => a.status === 'waiting').length;

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
          you choose when to get feedback — each one uses one of today’s marked answers.
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
              onFeedback={() => navigate(`/learn?${SAVED_ANSWER_PARAM}=${encodeURIComponent(item.id)}`)}
            />
          ))}
        </ul>
      </PageShell>
    </>
  );
}

function SavedAnswerCard({ item, online, onFeedback }: { item: SavedAnswer; online: boolean; onFeedback: () => void }) {
  return (
    <li className="flex flex-col gap-3 rounded-card surface p-4" data-testid="saved-answer">
      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink-subtle">
          {topicLabel(item.topicKey)} · {recordedLabel(item.recordedAt)}
        </span>
        <p className="text-[15px] font-semibold leading-snug text-ink">{item.questionText}</p>
      </div>

      {item.status === 'ready' && item.transcript && (
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
        <ListenButton item={item} />
        <Button size="sm" variant="quiet" onClick={() => void deleteSavedAnswer(item.id)} aria-label="Delete this saved answer">
          <span className="flex items-center gap-1.5"><Trash2 size={14} aria-hidden="true" /> Delete</span>
        </Button>
      </div>
    </li>
  );
}

function ListenButton({ item }: { item: SavedAnswer }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPlaying(false);
  };
  useEffect(() => stop, []);

  const toggle = () => {
    if (playing) {
      stop();
      return;
    }
    const url = URL.createObjectURL(savedAnswerBlob(item));
    urlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = stop;
    audio.onerror = stop;
    setPlaying(true);
    void audio.play().catch(stop);
  };

  return (
    <Button size="sm" variant="secondary" onClick={toggle} aria-pressed={playing}>
      <span className="flex items-center gap-1.5">
        {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        {playing ? 'Stop' : 'Listen'}
      </span>
    </Button>
  );
}
