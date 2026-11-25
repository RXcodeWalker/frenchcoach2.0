import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Shuffle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { fadeUp, stagger } from '../../components/motion/variants';
import { TOPICS } from '../../data/topics';
import type { Question } from '../../types';
import type { DrillQuestion } from './DrillRunner';
import {
  ANOTHER_QUESTION,
  DRILL_INTRO,
  DRILL_TITLE,
  NO_AI_NOTE,
  PICK_RECENT_TITLE,
  PICK_TOPIC_TITLE,
  PRIVACY_NOTE,
  START_DRILL,
} from './fluencyCopy';

/**
 * Picks the question to drill (fluency-trainer §3.1): first the Learn
 * questions this learner already answered out loud (the drill works best on
 * an answer they've thought through), then any topic. A topic gives a
 * warm-up or exam-level question (difficulty ≤ 2), so the time pressure goes
 * on flow, not on finding ideas.
 */
interface Props {
  recent: Question[];
  initialTopic: string | null;
  /** Learn's question bank lookup, passed in so this file stays free of the bank. */
  randomQuestion: (topicKey: string, excludeIds: string[]) => Question | undefined;
  topicKeys: string[];
  onStart: (q: DrillQuestion) => void;
}

const topicName = (key: string) => TOPICS.find((t) => t.key === key)?.labelEn ?? key;

export function DrillPicker({ recent, initialTopic, randomQuestion, topicKeys, onStart }: Props) {
  const [topic, setTopic] = useState<string | null>(initialTopic && topicKeys.includes(initialTopic) ? initialTopic : null);
  const [seen, setSeen] = useState<string[]>([]);
  const [nonce, setNonce] = useState(0);
  const picked = useMemo(
    () => (topic ? randomQuestion(topic, seen) : undefined),
    // `nonce` asks for another question on the same topic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic, nonce],
  );

  const start = (q: Question) => onStart({ id: q.id, text: q.text, topicKey: q.topicKey });

  return (
    <motion.div className="flex flex-col gap-6" variants={stagger} initial="hidden" animate="show" data-testid="drill-picker">
      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <h1 className="text-h2 text-ink">{DRILL_TITLE}</h1>
        <p className="text-body-l text-ink-muted">{DRILL_INTRO}</p>
        <p className="text-caption text-ink-subtle">{NO_AI_NOTE} {PRIVACY_NOTE}</p>
      </motion.div>

      {recent.length > 0 && (
        <motion.section variants={fadeUp} aria-labelledby="drill-recent" className="flex flex-col gap-3">
          <h2 id="drill-recent" className="text-section text-ink">{PICK_RECENT_TITLE}</h2>
          <ul className="flex flex-col gap-2">
            {recent.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => start(q)}
                  data-testid={`drill-recent-${q.id}`}
                  className="flex w-full items-center gap-3 rounded-card border border-hairline bg-surface p-4 text-left
                    transition-colors duration-state ease-smooth hover:border-hairline-strong active:bg-surface-recessed"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span lang="fr" className="text-[15px] font-semibold text-ink">{q.text}</span>
                    <span className="text-caption text-ink-subtle">{topicName(q.topicKey)}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      <motion.section variants={fadeUp} aria-labelledby="drill-topic" className="flex flex-col gap-3">
        <h2 id="drill-topic" className="text-section text-ink">{recent.length > 0 ? PICK_TOPIC_TITLE : 'Pick a topic'}</h2>
        {picked && (
          <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4" data-testid="drill-picked">
            <p lang="fr" className="text-subtitle text-ink">{picked.text}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => start(picked)} data-testid="drill-start">{START_DRILL}</Button>
              <Button
                variant="quiet"
                onClick={() => { setSeen((s) => [...s, picked.id]); setNonce((n) => n + 1); }}
              >
                <Shuffle size={14} aria-hidden="true" />
                {ANOTHER_QUESTION}
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Topics">
          {topicKeys.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={topic === key}
              onClick={() => { setTopic(key); setSeen([]); }}
              className={`rounded-pill border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-state ${
                topic === key ? 'border-action bg-action-soft text-action-text' : 'border-hairline text-ink-muted hover:border-hairline-strong'
              }`}
            >
              {topicName(key)}
            </button>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
