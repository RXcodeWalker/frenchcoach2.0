import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { TeachMe, MiniLesson } from '../../../types';

interface Props {
  teachMe?: TeachMe;
  mini_lesson?: MiniLesson;
  defaultOpen?: boolean;
  /** Forces open state from outside (e.g. the report's "expand all" control). */
  forceOpen?: boolean;
}

export function TeachMeLesson({ teachMe, mini_lesson, defaultOpen = false, forceOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = forceOpen ?? open;

  // Prefer mini_lesson (new backend) over teachMe (offline / legacy)
  const hasLesson = !!(mini_lesson || teachMe);
  if (!hasLesson) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => { if (forceOpen === undefined) setOpen(o => !o); }}
        className="flex items-center gap-1.5 text-[10px] text-action-text hover:text-action-text transition-colors"
      >
        <BookOpen size={11} />
        {mini_lesson ? mini_lesson.title : 'Teach Me'}
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={11} />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
            className="mt-2 space-y-2"
          >
            {mini_lesson ? (
              <MiniLessonContent lesson={mini_lesson} />
            ) : teachMe ? (
              <TeachMeContent teachMe={teachMe} />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniLessonContent({ lesson }: { lesson: MiniLesson }) {
  return (
    <>
      <div className="p-3 rounded-lg surface-recessed">
        <p className="text-eyebrow text-ink-muted uppercase mb-1">Rule</p>
        <p className="text-[10px] text-ink-muted">{lesson.rule}</p>
      </div>

      {lesson.examples.length > 0 && (
        <div className="p-3 rounded-lg surface-recessed">
          <p className="text-eyebrow text-ink-muted uppercase mb-2">
            Examples
          </p>
          <div className="space-y-1.5">
            {lesson.examples.map((ex, i) => (
              <p key={i} className="text-[10px] text-progress-text">{ex}</p>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg bg-reward-soft border border-hairline">
        <p className="text-eyebrow text-reward-text uppercase mb-1">Common mistake</p>
        <p className="text-[10px] text-reward-text">{lesson.common_mistake}</p>
      </div>

      <div className="p-3 rounded-lg bg-action-soft border border-hairline">
        <p className="text-eyebrow text-action-text uppercase mb-1">Practice</p>
        <p className="text-[10px] text-action-text">{lesson.practice}</p>
      </div>
    </>
  );
}

function TeachMeContent({ teachMe }: { teachMe: TeachMe }) {
  return (
    <>
      <div className="p-3 rounded-lg surface-recessed">
        <p className="text-eyebrow text-ink-muted uppercase mb-1">Rule</p>
        <p className="text-[10px] text-ink-muted">{teachMe.rule}</p>
      </div>

      <div className="p-3 rounded-lg surface-recessed">
        <p className="text-eyebrow text-ink-muted uppercase mb-1">Why you got it wrong</p>
        <p className="text-[10px] text-ink-muted">{teachMe.why}</p>
      </div>

      {teachMe.mnemonic && (
        <div className="p-3 rounded-lg bg-action-soft border border-hairline">
          <p className="text-eyebrow text-action-text uppercase mb-1">Memory trick</p>
          <p className="text-[10px] text-action-text">{teachMe.mnemonic}</p>
        </div>
      )}

      {teachMe.examples.length > 0 && (
        <div className="p-3 rounded-lg surface-recessed">
          <p className="text-eyebrow text-ink-muted uppercase mb-2">
            Mini-drills ({teachMe.examples.length})
          </p>
          <div className="space-y-2">
            {teachMe.examples.map((ex, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[8px] font-black text-ink-subtle mt-0.5 shrink-0 w-10">
                  Drill {i + 1}
                </span>
                <div>
                  <p className="text-[10px] text-progress-text font-medium">{ex.fr}</p>
                  <p className="text-[10px] text-ink-muted">{ex.en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {teachMe.advanced && (
        <div className="p-3 rounded-lg bg-reward-soft border border-hairline">
          <p className="text-eyebrow text-reward-text uppercase mb-1">Advanced alternative</p>
          <p className="text-[10px] text-reward-text">{teachMe.advanced}</p>
        </div>
      )}

      {teachMe.examinerNote && (
        <div className="p-3 rounded-lg bg-correction-soft border border-hairline">
          <p className="text-eyebrow text-correction-text uppercase mb-1">Examiner's note</p>
          <p className="text-[10px] text-correction-text italic">{teachMe.examinerNote}</p>
        </div>
      )}
    </>
  );
}
