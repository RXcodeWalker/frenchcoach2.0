import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Flame, X } from 'lucide-react';
import { Burst } from '../../components/motion/Burst';
import { celebrate, enter, enterReduced } from '../../components/motion/variants';
import { useApp } from '../../context/AppContext';
import { clearFreshSignIn, hasFreshSignIn } from '../../lib/freshSignIn';
import { useSfxOnChange } from '../../services/sound/useSfx';
import { hasSeenTour, shouldAutoStartTour } from '../tour/tourState';
import { WELCOME_VISIBLE_MS, welcomeLine } from './welcomeLine';

/**
 * The welcome after an active sign-in (the email form, Google, an OAuth
 * redirect or an emailed link): a raised card with a short, quiet burst, the
 * learner's name and their real streak. It shows once per sign-in, leaves by
 * itself, and is never shown for a session restored on app start.
 *
 * A brand-new account does not see this: its welcome is the "You're all set"
 * screen, which clears the marker (`OnboardingReady`). It also stands down when
 * the first-run app tour is about to open on Home (a new device, no history):
 * two overlays at once would fight, and the tour is the better first word.
 */
export function SignInWelcome() {
  const { state } = useApp();
  const reduced = useReducedMotion();
  // Read without consuming during render; consumed in the effect so StrictMode's double render can't lose it.
  const [open, setOpen] = useState(
    () => hasFreshSignIn() && !shouldAutoStartTour({ seen: hasSeenTour(), sessionCount: state.recentSessions?.length ?? 0 }),
  );

  useEffect(() => {
    clearFreshSignIn();
  }, []);

  const dismiss = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(dismiss, WELCOME_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [open, dismiss]);

  // The same neutral chord that ends a Learn session — a welcome, not a verdict.
  useSfxOnChange(open ? 'complete' : null, open, 200);

  const name = state.profile?.username?.trim();
  const { text, streak } = welcomeLine(state.profile?.streak_days ?? 0);
  const Icon = streak ? Flame : Check;

  return (
    <>
      {open && <Burst preset="shower" />}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={reduced ? enterReduced : enter}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.16 } }}
            role="status"
            data-testid="sign-in-welcome"
            className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 md:left-[88px]"
          >
            <div className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3.5 rounded-card border border-hairline-strong bg-surface-raised py-3 pl-4 pr-2 shadow-overlay">
              <motion.span
                variants={celebrate}
                initial="hidden"
                animate="show"
                aria-hidden="true"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${
                  streak ? 'bg-reward-soft text-streak-text' : 'bg-progress-soft text-progress-text'
                }`}
              >
                <Icon size={22} />
              </motion.span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-eyebrow uppercase text-progress-text">You're signed in</span>
                <span className="text-[16px] font-semibold text-ink">
                  <span lang="fr">Bon retour</span>
                  {name ? <>, <span lang="fr">{name}</span></> : ''}!
                </span>
                <span className="text-[13px] text-ink-muted">{text}</span>
              </span>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss welcome"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
