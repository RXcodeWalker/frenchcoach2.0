import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TOPICS } from '../data/gameData';
import { subTopicsFor } from '../data/learnSubTopics';
import { groupNotebook } from '../domain/learn/notebook/notebook';
import { PageShell } from '../components/layout/PageShell';
import { NotebookEntryCard } from '../features/notebook/NotebookEntryCard';

/**
 * Your exam notebook (Learn feedback Batch 6d): the "Say it better" answers the
 * learner chose to keep, grouped by topic and sub-topic. Local to this device and
 * to the signed-in account — a guest sees only the sign-in note. Framed as the
 * learner's material to adapt, never a script to memorise.
 */

const TOPIC_ORDER = TOPICS.map((t) => t.key);

function topicLabel(key: string): string {
  return TOPICS.find((t) => t.key === key)?.labelEn ?? key;
}

function subTopicLabel(topicKey: string, subTopic: string | null): string {
  if (subTopic === null) return 'Other';
  return subTopicsFor(topicKey).find((s) => s.key === subTopic)?.label ?? subTopic;
}

export function Notebook() {
  const { state } = useApp();
  const { user } = useAuth();
  const [micOwner, setMicOwner] = useState<string | null>(null);

  const groups = useMemo(
    () => groupNotebook(state.notebook, TOPIC_ORDER, (topicKey) => subTopicsFor(topicKey).map((s) => s.key)),
    [state.notebook],
  );

  return (
    <PageShell maxWidth="sm">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-ink">
          <BookMarked size={20} aria-hidden="true" /> Your exam notebook
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your own stories in correct French — material to adapt on the day, not a script to memorise.
        </p>
      </div>

      {user === null ? (
        <div className="space-y-2 rounded-xl surface p-4" data-testid="notebook-signed-out">
          <p className="text-sm text-ink">Sign in to keep your notes.</p>
          <p className="text-xs text-ink-muted">
            Your notebook is saved on this device for your account, so a guest session can't hold one.
          </p>
          <Link to="/login" className="inline-block text-xs font-semibold text-action-text underline underline-offset-2">
            Sign in
          </Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="space-y-2 rounded-xl surface p-4" data-testid="notebook-empty">
          <p className="text-sm text-ink">Nothing saved yet.</p>
          <p className="text-xs text-ink-muted">
            After a Learn answer, tap <span className="font-semibold">Save to notebook</span> under the teacher's feedback to keep your
            "Say it better" version here.
          </p>
          <Link to="/learn" className="inline-block text-xs font-semibold text-action-text underline underline-offset-2">
            Go to Learn
          </Link>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.topicKey} aria-label={topicLabel(g.topicKey)} className="space-y-3">
            <h2 className="text-eyebrow uppercase text-ink-muted">{topicLabel(g.topicKey)}</h2>
            {g.subTopics.map((s) => (
              <div key={s.subTopic ?? '∅'} className="space-y-2">
                <h3 className="text-xs font-bold text-ink">{subTopicLabel(g.topicKey, s.subTopic)}</h3>
                {s.entries.map((entry) => (
                  <NotebookEntryCard
                    key={entry.questionId}
                    entry={entry}
                    micLocked={micOwner !== null && micOwner !== entry.questionId}
                    onMicActive={(active) => setMicOwner(active ? entry.questionId : null)}
                  />
                ))}
              </div>
            ))}
          </section>
        ))
      )}
    </PageShell>
  );
}
