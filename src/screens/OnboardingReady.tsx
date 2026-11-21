import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarClock, Check, Rocket, Target } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Burst } from '../components/motion/Burst';
import { EASE, EASE_SPRING, enter, enterReduced, fill, stagger } from '../components/motion/variants';
import { useApp } from '../context/AppContext';
import { localDay } from '../lib/localDay';
import { clearFreshSignIn } from '../lib/freshSignIn';
import { isSafeReturnTo } from '../utils/routeSafety';
import { getActiveGoal, getCoachProfile } from '../services/coach/coachProfileService';
import { preloadScreenFor } from '../routing/screens';
import { useSfxOnChange } from '../services/sound/useSfx';
import { track } from '../services/telemetry/telemetryService';
import { BUILD_HOLD_MS, BUILD_STEP_MS, buildSteps, PATH_STEPS } from '../features/onboarding/planSummary';

/**
 * The end of first-run setup (`/onboarding/ready`): a short "building your
 * plan" beat, then a proper "you're all set" moment with the road ahead and one
 * clear next step. It replaces going straight from the last survey question to
 * a speaking test with nothing in between.
 *
 * The beat is real as well as theatre: it restates the learner's own answers,
 * and it downloads the screens they are about to open, so the next tap is
 * instant. It is short on purpose (≈ 3 s) — a longer fake load would cost more
 * goodwill than it earns. Under reduced motion it is skipped.
 *
 * Nothing here writes app state: the goal was saved by the survey. Refreshing
 * the page just replays the beat.
 */

type Phase = 'building' | 'ready';

const STEP_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE } },
};
const STEP_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function OnboardingReady() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo');
  const destination = isSafeReturnTo(rawReturnTo) ? rawReturnTo : '/';
  const placementUrl = `/onboarding/placement?returnTo=${encodeURIComponent(destination)}`;

  const { state } = useApp();
  const name = state.profile?.username?.trim();
  const reduced = useReducedMotion();

  const steps = useMemo(() => {
    const profile = getCoachProfile();
    return buildSteps({ goalType: getActiveGoal(profile)?.type, examDate: profile.examDate, today: localDay() });
  }, []);

  // A learner who skipped the survey gets the short version: straight to the reveal.
  const skipped = searchParams.get('skipped') === '1';
  const [phase, setPhase] = useState<Phase>(skipped ? 'ready' : 'building');
  const [doneCount, setDoneCount] = useState(0);

  // This screen is the welcome for a brand-new account: no second "welcome back" on Home.
  // The next screens' code is fetched while the learner watches the plan build.
  useEffect(() => {
    clearFreshSignIn();
    void preloadScreenFor('/onboarding/placement');
    void preloadScreenFor('/');
    void preloadScreenFor('/learn');
  }, []);

  useEffect(() => {
    if (phase !== 'building') return;
    if (reduced) {
      setDoneCount(steps.length);
      setPhase('ready');
      return;
    }
    const timers = steps.map((_, i) => window.setTimeout(() => setDoneCount(i + 1), BUILD_STEP_MS * (i + 1)));
    timers.push(window.setTimeout(() => setPhase('ready'), BUILD_STEP_MS * steps.length + BUILD_HOLD_MS));
    return () => timers.forEach(window.clearTimeout);
  }, [phase, reduced, steps]);

  // The reveal: count it once, say it to a screen reader, play the fanfare.
  useEffect(() => {
    if (phase === 'ready') track({ name: 'onboarding_ready_viewed', props: {} });
  }, [phase]);
  // The heading mounts after the building list has faded out, so focus it when it appears.
  const focusHeading = useCallback((el: HTMLHeadingElement | null) => {
    el?.focus({ preventScroll: true });
  }, []);
  useSfxOnChange(phase === 'ready' ? 'achievement' : null, phase, 180);

  function go(action: 'placement' | 'skip') {
    track({ name: 'onboarding_ready_action', props: { action } });
    navigate(action === 'placement' ? placementUrl : destination, { replace: true });
  }

  const stepProps = reduced ? STEP_VARIANTS_REDUCED : STEP_VARIANTS;
  const item = reduced ? enterReduced : enter;
  const [goal, rhythm, , mission] = steps;

  return (
    <div className="min-h-screen bg-bg px-4 pb-12 pt-6 sm:pt-10">
      {/* Outside the animated sections: a transformed ancestor would turn its fixed canvas into a local one. */}
      {phase === 'ready' && <Burst preset="cannons" />}
      <div className="mx-auto w-full max-w-[520px]">
        <AnimatePresence mode="wait">
          {phase === 'building' ? (
            <motion.section key="building" {...stepProps} aria-labelledby="ob-build-h" data-testid="onboarding-building" className="mt-[10vh]">
              <p className="mb-3 text-eyebrow uppercase text-action-text">Setting up</p>
              <h1 id="ob-build-h" className="text-title text-ink sm:text-h2">Building your plan{name ? `, ${name}` : ''}</h1>
              <p className="mt-2 text-body-base text-ink-muted">Shaping every session around your answers.</p>

              <div
                className="mt-6 h-1.5 overflow-hidden rounded-pill bg-track"
                role="progressbar"
                aria-label="Building your plan"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={doneCount}
              >
                <motion.span
                  className="block h-full rounded-pill bg-action"
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                  transition={fill(0)}
                />
              </div>

              <ul className="surface mt-5 grid gap-3.5 rounded-card p-4">
                {steps.map((s, i) => {
                  const done = i < doneCount;
                  return (
                    <li key={s.id} className="flex items-center gap-3" data-done={done}>
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border transition-colors duration-state ease-smooth ${
                          done ? 'border-progress bg-progress text-action-ink' : 'border-hairline-strong'
                        }`}
                      >
                        {done && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className={`text-[15px] transition-colors duration-state ease-smooth ${done ? 'font-semibold text-ink' : 'text-ink-subtle'}`}>
                        {done ? s.done : s.working}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.section>
          ) : (
            <motion.section
              key="ready"
              variants={stagger}
              initial="hidden"
              animate="show"
              aria-labelledby="ob-ready-h"
              data-testid="onboarding-ready"
            >
              <motion.div variants={item} className="mb-6">
                <motion.span
                  aria-hidden="true"
                  initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: { duration: 0.52, ease: EASE_SPRING } }}
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-pill bg-progress-soft text-progress-text"
                >
                  <Check size={28} strokeWidth={2.5} />
                </motion.span>
                <p className="mb-2 text-eyebrow uppercase text-progress-text">Setup complete</p>
                <h1
                  id="ob-ready-h"
                  ref={focusHeading}
                  tabIndex={-1}
                  className="text-title text-ink outline-none sm:text-h2"
                >
                  You're all set{name ? `, ${name}` : ''}.
                </h1>
                <p className="mt-2 text-body-base text-ink-muted">Here's the plan your coach built from your answers.</p>
              </motion.div>

              <motion.ul variants={item} className="surface mb-4 grid gap-3.5 rounded-card p-4" aria-label="Your plan">
                <PlanRow Icon={Target} text={goal.done} />
                <PlanRow Icon={CalendarClock} text={rhythm.done} />
                <PlanRow Icon={Rocket} text={mission.done} />
              </motion.ul>

              <motion.section variants={item} aria-labelledby="ob-path-h" className="surface mb-6 rounded-card p-4">
                <h2 id="ob-path-h" className="mb-3 text-eyebrow uppercase text-ink-subtle">The road ahead</h2>
                <ol className="grid gap-4">
                  {PATH_STEPS.map((p, i) => (
                    <li key={p.n} className="relative flex gap-3.5" aria-current={i === 0 ? 'step' : undefined}>
                      {i < PATH_STEPS.length - 1 && (
                        <span aria-hidden="true" className="absolute left-[13px] top-8 h-[calc(100%-4px)] w-px bg-hairline-strong" />
                      )}
                      <span
                        aria-hidden="true"
                        className={`font-numeral relative flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-[13px] ${
                          i === 0 ? 'bg-action text-action-ink' : 'border border-hairline-strong bg-surface text-ink-muted'
                        }`}
                      >
                        {p.n}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-ink">{p.title}</span>
                          {i === 0 && (
                            <span className="rounded-pill bg-action-soft px-2 py-0.5 text-[12px] font-semibold text-action-text">Next</span>
                          )}
                        </span>
                        <span className="block text-body-s text-ink-muted">{p.detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </motion.section>

              <motion.div variants={item} className="flex flex-col gap-2">
                <Button size="lg" className="w-full" onClick={() => go('placement')} data-testid="onboarding-ready-placement">
                  Find my level <ArrowRight size={18} aria-hidden="true" />
                </Button>
                <Button variant="quiet" className="w-full" onClick={() => go('skip')} data-testid="onboarding-ready-skip">
                  Skip — take me to my plan
                </Button>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlanRow({ Icon, text }: { Icon: typeof Target; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text">
        <Icon size={18} />
      </span>
      <span className="text-[15px] font-semibold text-ink">{text}</span>
    </li>
  );
}
