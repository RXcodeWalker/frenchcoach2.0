import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ExamTopicArea } from '../../../data/news/types';
import { LEARN_TOPIC_PARAM, topicFromDeepLink } from '../../learn/topicDeepLink';

/** Cambridge 0520's topic areas (syllabus p.14), as the exam guide names them. */
const AREA_NAMES: Record<ExamTopicArea, string> = {
  A: 'Everyday activities',
  B: 'Personal and social life',
  C: 'The world around us',
  D: 'The world of work',
  E: 'The international world',
};

interface Props {
  examArea: ExamTopicArea;
  learnTopic?: string;
}

/**
 * Where today's story leads (daily-news §11): its exam topic area, and the
 * Learn topic to practise it in — only when the topic grid would let the
 * learner open it (visible, unlocked).
 */
export function StoryLinks({ examArea, learnTopic }: Props) {
  const topic = topicFromDeepLink(learnTopic ?? null);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-testid="news-story-links">
      <p className="text-body-s text-ink-muted">
        Exam topic area <span className="font-numeral text-ink">{examArea}</span>: {AREA_NAMES[examArea]}
      </p>
      {topic && (
        <Link
          to={`/learn?${LEARN_TOPIC_PARAM}=${encodeURIComponent(topic.key)}`}
          className="inline-flex min-h-11 items-center gap-1 self-start rounded-control px-3 text-label text-action-text hover:bg-track sm:self-auto"
        >
          Practise {topic.labelEn} in Learn <ChevronRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
