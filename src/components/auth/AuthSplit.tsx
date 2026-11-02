import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mic, MessageSquareText, TrendingUp, Check, ArrowRight } from 'lucide-react';
import { enter, enterReduced } from '../motion/variants';
import { BrandMark } from './AuthShell';

const POINTS = [
  { Icon: Mic, title: 'Speak out loud', body: 'Record real answers, the way the exam asks for them.' },
  { Icon: MessageSquareText, title: 'Feedback you can use', body: 'Every fix quoted from what you said, with a better way to say it.' },
  { Icon: TrendingUp, title: 'See yourself improve', body: 'Daily goals, streaks and a clear next step.' },
];

/**
 * The sign-in page frame (Design System v2): from lg up, a recessed brand panel
 * (what the app does, one example of the feedback) beside the form; below lg only
 * the form with a compact brand row. Flat surfaces, hairlines, the `enter` motion.
 */
export function AuthSplit({ children, below }: { children: ReactNode; below?: ReactNode }) {
  const reduced = useReducedMotion();
  const v = reduced ? enterReduced : enter;
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="hidden border-r border-hairline bg-surface-recessed lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20">
        <div className="flex items-center gap-3">
          <BrandMark small />
          <span className="text-section text-ink">Français AI</span>
        </div>

        <motion.div variants={v} initial="hidden" animate="show" className="max-w-[460px]">
          <p className="text-eyebrow uppercase text-action-text">IGCSE &amp; A-Level French speaking</p>
          <h2 className="mt-3 text-h1 text-ink">Speak French like it counts.</h2>
          <p className="mt-4 text-body-l text-ink-muted">
            Practise out loud, get coaching on exactly what you said, and walk into the exam knowing what to expect.
          </p>

          <ul className="mt-8 space-y-4">
            {POINTS.map(({ Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{title}</span>
                  <span className="block text-body-s text-ink-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>

          <figure className="surface mt-10 rounded-card p-4" aria-label="Example of coach feedback">
            <figcaption className="text-eyebrow uppercase text-ink-subtle">Example feedback</figcaption>
            <p lang="fr" className="mt-2 text-subtitle text-ink">« Hier, je suis allé au cinéma. »</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-progress-soft px-3 text-label text-progress-text">
                <Check size={14} aria-hidden="true" /> Past tense used correctly
              </span>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-info-soft px-3 text-label text-info-text">
                <ArrowRight size={14} aria-hidden="true" /> Add a reason: parce que…
              </span>
            </div>
          </figure>
        </motion.div>

        <p className="text-caption text-ink-subtle">Built for Cambridge IGCSE French (0520).</p>
      </aside>

      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 lg:min-h-0">
        <motion.div variants={v} initial="hidden" animate="show" className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark small />
            <span className="text-section text-ink">Français AI</span>
          </div>
          {children}
          {below != null && <div className="mt-6">{below}</div>}
        </motion.div>
      </main>
    </div>
  );
}
