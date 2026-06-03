import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { TeachMe, MiniLesson } from '../../../types';

interface Props {
  teachMe?: TeachMe;
  mini_lesson?: MiniLesson;
}

export function TeachMeLesson({ teachMe, mini_lesson }: Props) {
  const [open, setOpen] = useState(false);

  // Prefer mini_lesson (new backend) over teachMe (offline / legacy)
  const hasLesson = !!(mini_lesson || teachMe);
  if (!hasLesson) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
      >
        <BookOpen size={11} />
        {mini_lesson ? mini_lesson.title : 'Teach Me'}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={11} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
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
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Rule</p>
        <p className="text-[10px] text-slate-300">{lesson.rule}</p>
      </div>

      {lesson.examples.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-2">
            Examples
          </p>
          <div className="space-y-1.5">
            {lesson.examples.map((ex, i) => (
              <p key={i} className="text-[10px] text-emerald-300">{ex}</p>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/15">
        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mb-1">Common mistake</p>
        <p className="text-[10px] text-amber-300">{lesson.common_mistake}</p>
      </div>

      <div className="p-3 rounded-lg bg-violet-500/8 border border-violet-500/15">
        <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wide mb-1">Practice</p>
        <p className="text-[10px] text-violet-300">{lesson.practice}</p>
      </div>
    </>
  );
}

function TeachMeContent({ teachMe }: { teachMe: TeachMe }) {
  return (
    <>
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Rule</p>
        <p className="text-[10px] text-slate-300">{teachMe.rule}</p>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Why you got it wrong</p>
        <p className="text-[10px] text-slate-400">{teachMe.why}</p>
      </div>

      {teachMe.mnemonic && (
        <div className="p-3 rounded-lg bg-violet-500/8 border border-violet-500/15">
          <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wide mb-1">Memory trick</p>
          <p className="text-[10px] text-violet-300">{teachMe.mnemonic}</p>
        </div>
      )}

      {teachMe.examples.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-2">
            Mini-drills ({teachMe.examples.length})
          </p>
          <div className="space-y-2">
            {teachMe.examples.map((ex, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[8px] font-black text-slate-600 mt-0.5 shrink-0 w-10">
                  Drill {i + 1}
                </span>
                <div>
                  <p className="text-[10px] text-emerald-300 font-medium">{ex.fr}</p>
                  <p className="text-[10px] text-slate-500">{ex.en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {teachMe.advanced && (
        <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/15">
          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mb-1">Advanced alternative</p>
          <p className="text-[10px] text-amber-300">{teachMe.advanced}</p>
        </div>
      )}

      {teachMe.examinerNote && (
        <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/15">
          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide mb-1">Examiner's note</p>
          <p className="text-[10px] text-red-300 italic">{teachMe.examinerNote}</p>
        </div>
      )}
    </>
  );
}
