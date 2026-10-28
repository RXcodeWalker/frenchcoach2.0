import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AudioLines, BookMarked, ChevronRight, Lock, Shuffle } from 'lucide-react';
import { TOPICS } from '../../data/gameData';
import { LEARN_TOPIC_DEPENDENCIES } from '../../data/learnTopicDependencies';
import { isLearnTopicUnlocked } from '../../features/learn/topicProgress';
import { isTopicVisible } from '../../features/learn/sessionSetup';
import { TopicChip } from '../../components/ui/TopicChip';
import { fadeUp, fill, stagger } from '../../components/motion/variants';
import type { Topic, DifficultyTier, TopicMasteryEntry } from '../../types/index';

interface Props {
  onSelect: (topic: Topic) => void;
  title?: string;
  subtitle?: string;
  selectedDifficulty?: DifficultyTier;
  /** Show the way into the exam notebook (Learn only; Listening Mode shares this grid). */
  showNotebookLink?: boolean;
  /** Show the way into the Pronunciation Lab home (Learn only, while `pronunciationLab` is live). */
  showSoundsLink?: boolean;
  /** Per-topic progress for the tiles' bars and averages; omitted, every tile reads "N questions". */
  topicMastery?: Record<string, TopicMasteryEntry>;
  /** The topic the coach recommends, badged "Coach’s pick". */
  coachPickKey?: string | null;
}

function topicLabel(key: string): string {
  return TOPICS.find(t => t.key === key)?.label ?? key;
}

function lockReason(topic: Topic): string {
  const deps = LEARN_TOPIC_DEPENDENCIES[topic.key] ?? [];
  const depLabels = deps.map(topicLabel).join(', ');
  return `Complete 5 sessions in ${depLabels} averaging 7+/10 to unlock.`;
}

/**
 * Learn's topic grid (Design System v2): tiles with the topic's hue chip,
 * French and English names, an answered-progress bar and the average. A
 * locked advanced topic is recessed with a lock and its reason — never faded.
 * Below: Random question and the exam notebook.
 */
export function TopicGrid({
  onSelect, title = 'Learn', subtitle = 'Choose a topic and start practising', showNotebookLink = false, showSoundsLink = false, topicMastery = {}, coachPickKey = null,
}: Props) {
  // Topics too small to practise as a session stay out of the grid (docs §13.4).
  const visibleTopics = TOPICS.filter(isTopicVisible);

  const handleTopicClick = (topic: Topic, unlocked: boolean) => {
    if (!unlocked) return;
    onSelect(topic);
  };

  return (
    <motion.div className="flex flex-col gap-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink">{title}</h1>
        <p className="text-body-l text-ink-muted">{subtitle}</p>
      </motion.div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(max(150px,calc((100%-36px)/4)),1fr))]">
        {visibleTopics.map(topic => {
          const unlocked = !topic.isAdvanced || isLearnTopicUnlocked(LEARN_TOPIC_DEPENDENCIES[topic.key] ?? []);
          const m = topicMastery[topic.key];
          const answered = m?.uniqueQuestionsAnswered.length ?? 0;
          const avg = m?.averageScore ?? null;
          const pct = topic.questionsCount > 0 ? Math.min(100, (answered / topic.questionsCount) * 100) : 0;
          const isCoach = unlocked && coachPickKey === topic.key;
          return (
            <motion.button
              key={topic.key}
              type="button"
              variants={fadeUp}
              onClick={() => handleTopicClick(topic, unlocked)}
              aria-disabled={!unlocked}
              aria-label={!unlocked ? `${topic.label} — locked. ${lockReason(topic)}` : undefined}
              className={`flex min-w-0 flex-col gap-4 rounded-card border border-hairline p-5 text-left text-ink
                transition-colors duration-state ease-smooth
                ${unlocked ? 'bg-surface hover:border-hairline-strong active:bg-surface-recessed' : 'cursor-not-allowed bg-surface-recessed'}`}
              data-testid={`topic-${topic.key}`}
            >
              <span className="flex items-start justify-between gap-2">
                {unlocked ? (
                  <TopicChip topicKey={topic.key} size={40} />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-surface text-ink-subtle" aria-hidden="true">
                    <Lock size={18} />
                  </span>
                )}
                {isCoach && (
                  <span className="inline-flex h-6 items-center whitespace-nowrap rounded-pill bg-action-soft px-2 text-caption font-semibold text-action-text">
                    Coach’s pick
                  </span>
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={`text-[16px] font-semibold leading-[1.3] ${unlocked ? 'text-ink' : 'text-ink-muted'}`}>{topic.label}</span>
                <span className="text-[13px] leading-[1.4] text-ink-subtle">{topic.labelEn}</span>
              </span>
              {unlocked ? (
                <span className="mt-auto flex flex-col gap-2">
                  <span className="block h-1 overflow-hidden rounded-pill bg-track">
                    <motion.span
                      className="block h-full rounded-pill bg-progress"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={fill()}
                    />
                  </span>
                  <span className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-caption text-ink-subtle">
                    <span className="font-numeral text-ink-muted">
                      {answered > 0 ? `avg ${avg !== null ? avg.toFixed(1) : '—'}` : 'Not started'}
                    </span>
                    <span>{answered > 0 ? `${answered} of ${topic.questionsCount} answered` : `${topic.questionsCount} questions`}</span>
                  </span>
                </span>
              ) : (
                <span className="mt-auto text-caption text-ink-subtle">{lockReason(topic)}</span>
              )}
            </motion.button>
          );
        })}
      </div>

      <motion.div variants={fadeUp} className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
        <button
          type="button"
          onClick={() => onSelect(visibleTopics[Math.floor(Math.random() * visibleTopics.length)])}
          className="flex items-center gap-3 rounded-card border border-hairline bg-surface-recessed p-4 text-left text-ink
            transition-colors duration-state ease-smooth hover:border-hairline-strong"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-hairline bg-surface text-ink-muted" aria-hidden="true">
            <Shuffle size={20} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[14px] font-semibold">Random question</span>
            <span className="text-[13px] text-ink-subtle">A question from any topic</span>
          </span>
          <ChevronRight size={16} className="text-ink-subtle" aria-hidden="true" />
        </button>

        {showSoundsLink && (
          <Link
            to="/learn/sounds"
            className="flex items-center gap-3 rounded-card border border-hairline bg-surface-recessed p-4 text-left text-ink
              transition-colors duration-state ease-smooth hover:border-hairline-strong"
            data-testid="sounds-link"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-hairline bg-surface text-action-text" aria-hidden="true">
              <AudioLines size={20} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-[14px] font-semibold">Pronunciation Lab</span>
              <span className="text-[13px] text-ink-subtle">Your sounds, ear training and tricky words</span>
            </span>
            <ChevronRight size={16} className="text-ink-subtle" aria-hidden="true" />
          </Link>
        )}

        {showNotebookLink && (
          <Link
            to="/notebook"
            className="flex items-center gap-3 rounded-card border border-hairline bg-surface-recessed p-4 text-left text-ink
              transition-colors duration-state ease-smooth hover:border-hairline-strong"
            data-testid="notebook-link"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-hairline bg-surface text-action-text" aria-hidden="true">
              <BookMarked size={20} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-[14px] font-semibold">Your exam notebook</span>
              <span className="text-[13px] text-ink-subtle">Answers you kept, to listen to and practise from memory</span>
            </span>
            <ChevronRight size={16} className="text-ink-subtle" aria-hidden="true" />
          </Link>
        )}
      </motion.div>
    </motion.div>
  );
}
