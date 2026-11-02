import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Gift, Sparkles } from 'lucide-react';
import { TopContextBar } from '../components/TopContextBar';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { CountUp } from '../components/motion/CountUp';
import { celebrate, enter, enterReduced, fill } from '../components/motion/variants';
import { claimMysteryBox, type ClaimMysteryBoxResult } from '../services/mysteryBox/mysteryBoxService';

type BoxState =
  | { name: 'closed' }
  | { name: 'opening' }
  | { name: 'revealed'; value: number; title: string }
  | { name: 'already-claimed' }
  | { name: 'error'; reason: 'not_authenticated' | 'offline' | 'unknown' };

/** Reliability plan §2.6: display-only titles keyed by the server's chosen amount — the
 * reward tiers themselves (50/100/250) live server-side in claim_mystery_box now. */
const REWARD_TITLES: Record<number, string> = {
  50: 'Mini XP Boost',
  100: 'Mega XP Boost',
  250: 'Legendary XP Cache',
};

const ERROR_COPY: Record<'not_authenticated' | 'offline' | 'unknown', { title: string; body: string }> = {
  not_authenticated: {
    title: 'Sign in to open the box',
    body: 'Your daily box is tied to your account, so it can only be opened when you are signed in.',
  },
  offline: {
    title: 'You seem to be offline',
    body: 'The box needs a connection to open. Check your internet and try again.',
  },
  unknown: {
    title: 'Couldn’t open the box',
    body: 'Something went wrong on our side. Please try again in a moment.',
  },
};

/** Shortest the "opening" state stays up, so a fast reply doesn't flash by (ms). */
const MIN_OPENING_MS = 700;

/**
 * Mystery Box: one free box a day. The reward is chosen and awarded by the
 * server (`claim_mystery_box`); this screen only asks and displays the result.
 * Design System v2: role tokens only, the named `enter` / `fill` / `celebrate`
 * motions, and no looping, glow or hover scale.
 */
export function MysteryBox() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const [box, setBox] = useState<BoxState>({ name: 'closed' });
  const alive = useRef(true);
  const claiming = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const openBox = async () => {
    if (claiming.current) return;
    claiming.current = true;
    setBox({ name: 'opening' });
    const started = Date.now();
    const result: ClaimMysteryBoxResult = await claimMysteryBox();
    const wait = Math.max(0, MIN_OPENING_MS - (Date.now() - started));
    await new Promise(resolve => setTimeout(resolve, reduced ? 0 : wait));
    claiming.current = false;
    if (!alive.current) return;
    if (!result.ok) setBox({ name: 'error', reason: result.reason });
    else if (result.alreadyClaimed) setBox({ name: 'already-claimed' });
    else setBox({ name: 'revealed', value: result.xpAwarded, title: REWARD_TITLES[result.xpAwarded] ?? 'XP Reward' });
  };

  const backToExplore = () => navigate('/explore');

  return (
    <>
      <TopContextBar
        title="Mystery Box"
        subtitle="One free box a day"
        showBack
        backLabel="Back to Explore"
        onBack={backToExplore}
      />
      <PageShell maxWidth="sm" gap={16}>
        <motion.section
          variants={item}
          className="rounded-card border border-hairline bg-surface p-6 text-center md:p-8"
          aria-labelledby="mb-heading"
        >
          {box.name === 'closed' && (
            <>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-card bg-reward-soft">
                <Gift size={48} className="text-reward-text" aria-hidden="true" />
              </div>
              <p className="mt-6 text-eyebrow uppercase text-ink-subtle">Daily surprise</p>
              <h2 id="mb-heading" className="mt-2 text-title text-ink">Your box is ready</h2>
              <p className="mt-2 text-body-s text-ink-muted">
                Open it to win bonus XP. You get one every day.
              </p>
              <Button size="lg" className="mt-6 w-full" onClick={() => void openBox()} data-testid="mb-open">
                <Gift size={16} aria-hidden="true" />
                Open the box
              </Button>
            </>
          )}

          {box.name === 'opening' && (
            <div role="status" aria-live="polite" data-testid="mb-opening">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-card bg-reward-soft">
                <Sparkles size={48} className="text-reward-text" aria-hidden="true" />
              </div>
              <h2 id="mb-heading" className="mt-6 text-title text-ink">Opening&hellip;</h2>
              <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-pill bg-track" aria-hidden="true">
                <motion.div
                  className="h-full origin-left rounded-pill bg-reward"
                  initial={{ scaleX: reduced ? 1 : 0 }}
                  animate={{ scaleX: 1 }}
                  transition={fill(0)}
                />
              </div>
            </div>
          )}

          {box.name === 'revealed' && (
            <div data-testid="mb-revealed">
              <motion.div
                variants={celebrate}
                initial="hidden"
                animate="show"
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-card bg-reward-soft"
              >
                <Gift size={48} className="text-reward-text" aria-hidden="true" />
              </motion.div>
              <p className="mt-6 text-eyebrow uppercase text-ink-subtle">You found</p>
              <h2 id="mb-heading" className="mt-2 text-title text-ink">{box.title}</h2>
              <p className="mt-4 font-numeral text-num-xl text-reward-text">
                +<CountUp value={box.value} data-testid="mb-xp" />
                <span className="ml-2 text-subtitle text-ink-muted">XP</span>
              </p>
              <p className="mt-3 text-body-s text-ink-muted">
                It&rsquo;s on its way to your total. Come back tomorrow for another box.
              </p>
              <Button size="lg" className="mt-6 w-full" onClick={backToExplore}>
                Back to Explore
              </Button>
            </div>
          )}

          {box.name === 'already-claimed' && (
            <div data-testid="mb-claimed">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-card bg-track">
                <CalendarCheck size={48} className="text-ink-muted" aria-hidden="true" />
              </div>
              <h2 id="mb-heading" className="mt-6 text-title text-ink">Already opened today</h2>
              <p className="mt-2 text-body-s text-ink-muted">Come back tomorrow for another Mystery Box.</p>
              <Button size="lg" className="mt-6 w-full" onClick={backToExplore}>
                Back to Explore
              </Button>
            </div>
          )}

          {box.name === 'error' && (
            <div role="alert" data-testid="mb-error">
              <h2 id="mb-heading" className="text-title text-ink">{ERROR_COPY[box.reason].title}</h2>
              <p className="mt-2 text-body-s text-ink-muted">{ERROR_COPY[box.reason].body}</p>
              <div className="mt-6 flex flex-col gap-3">
                {box.reason !== 'not_authenticated' && (
                  <Button size="lg" onClick={() => setBox({ name: 'closed' })}>Try again</Button>
                )}
                <Button
                  variant={box.reason === 'not_authenticated' ? 'primary' : 'quiet'}
                  size="lg"
                  onClick={backToExplore}
                >
                  Back to Explore
                </Button>
              </div>
            </div>
          )}
        </motion.section>
      </PageShell>
    </>
  );
}
