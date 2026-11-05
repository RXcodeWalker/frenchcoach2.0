import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import { resolveFeatureStatus } from '../../config/featureFlags';
import { track } from '../../services/telemetry/telemetryService';
import { TOPICS } from '../../data/topics';
import { STORY_CARDS } from '../../data/storyCards';
import { dueLabel, homeworkLink } from './homework';
import { useMyHomework } from './useMyHomework';
import type { MyAssignment } from '../../services/teacher/teacherApi';

function what(a: MyAssignment): string {
  if (a.kind === 'learn_topic') {
    const topic = TOPICS.find((t) => t.key === a.topicKey);
    return `Learn · ${topic?.labelEn || topic?.label || a.topicKey} · ${a.questionCount} ${a.questionCount === 1 ? 'answer' : 'answers'}`;
  }
  if (a.kind === 'role_play') return `Role play · ${STORY_CARDS.find((c) => c.id === a.rolePlayCardId)?.title ?? 'card'}`;
  return 'Mock exam · Exam Sim';
}

/**
 * Home's "Set by your teacher" card (teacher dashboard Stage 3). Shows nothing for a
 * learner without homework — or when it can't be read, so a missing backend never
 * puts an error on Home.
 */
export function HomeworkCard() {
  const navigate = useNavigate();
  const live = resolveFeatureStatus('teacherDashboard') === 'live';
  const { assignments } = useMyHomework(live);
  if (!live || !assignments || assignments.length === 0) return null;
  const shown = assignments.slice(0, 3);
  // Several classes can set homework; name the class on each row unless it all comes from one.
  const oneSource = new Set(assignments.map((a) => a.className)).size === 1;
  return (
    <motion.section variants={fadeUp} className="rounded-card border border-hairline bg-surface p-4" aria-labelledby="homework-h" data-testid="home-homework">
      <div className="flex items-center gap-2">
        <ClipboardList size={16} className="text-action-text" aria-hidden="true" />
        <h2 id="homework-h" className="text-label text-ink">
          {oneSource ? `Set by ${shown[0].teacherName}` : 'Homework from your teachers'}
        </h2>
      </div>
      <ul className="mt-2 flex flex-col">
        {shown.map((a) => (
          <li key={a.id} className="border-t border-hairline first:border-t-0">
            <button
              type="button"
              onClick={() => {
                track({ name: 'homework_opened', props: { kind: a.kind } });
                navigate(homeworkLink(a));
              }}
              className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block text-body-s text-ink">{a.title}</span>
                <span className="block text-caption text-ink-muted">
                  {what(a)}
                  {!oneSource && ` · ${a.className}`}
                </span>
              </span>
              <span className="shrink-0 text-caption text-ink-subtle">{dueLabel(a.dueAt)} ›</span>
            </button>
          </li>
        ))}
      </ul>
      {assignments.length > shown.length && (
        <p className="text-caption text-ink-subtle mt-1">+{assignments.length - shown.length} more</p>
      )}
    </motion.section>
  );
}
