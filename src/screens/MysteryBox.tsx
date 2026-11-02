import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Gift, Star } from 'lucide-react';
import { TopContextBar } from '../components/TopContextBar';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { CountUp } from '../components/motion/CountUp';
import { celebrate, enter, enterReduced, fill, slide, stagger, streakFlame } from '../components/motion/variants';
import { track } from '../services/telemetry/telemetryService';
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

const TIERS = [50, 100, 250] as const;

/* Owner exception (2026-11-02): Mystery Box alone may use confetti, glow, looping motion and
 * hover scale. Everything below stays on role tokens and switches off under reduced motion. */

const CONFETTI_TOKENS = ['--reward', '--action', '--progress', '--streak', '--info'] as const;

/** Deterministic 0..1 from an index, so a render never calls Math.random. */
const unit = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Pieces for a reveal: a bigger prize throws more. */
const confettiCount = (xp: number) => (xp >= 250 ? 56 : xp >= 100 ? 36 : 22);

/** A one-shot burst from the box. Pieces fly out, fall under "gravity" and fade. */
function Confetti({ count }: { count: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="mb-confetti">
      {Array.from({ length: count }, (_, i) => {
        const angle = -Math.PI / 2 + (unit(i, 1) - 0.5) * Math.PI * 1.25;
        const speed = 110 + unit(i, 2) * 170;
        const x = Math.cos(angle) * speed;
        const up = Math.sin(angle) * speed;
        const size = 6 + Math.round(unit(i, 3) * 6);
        const wide = unit(i, 4) > 0.5;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[88px] block"
            style={{
              width: wide ? size * 1.6 : size,
              height: size,
              borderRadius: wide ? 2 : 999,
              backgroundColor: `var(${CONFETTI_TOKENS[i % CONFETTI_TOKENS.length]})`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{
              x: [0, x * 0.7, x],
              y: [0, up, up + 260 + unit(i, 5) * 120],
              rotate: (unit(i, 6) - 0.5) * 900,
              opacity: [1, 1, 0],
              scale: 1,
            }}
            transition={{ duration: 1.5 + unit(i, 7) * 0.9, ease: 'easeOut', times: [0, 0.45, 1], delay: unit(i, 8) * 0.12 }}
          />
        );
      })}
    </div>
  );
}

/**
 * The box, drawn from tokens. Closed it sits still; opening wiggles once (the
 * `streak` wiggle), then the lid lifts on the `slide` easing and a star rises
 * out (`enter`). Closed, it bobs and glows; hover lifts it.
 */
function BoxArt({ phase, reduced, onClick }: { phase: 'closed' | 'opening' | 'open' | 'spent'; reduced: boolean; onClick?: () => void }) {
  const open = phase === 'open';
  const spent = phase === 'spent';
  const body = spent ? 'border-hairline-strong bg-track' : 'border-reward bg-reward-soft';
  const band = spent ? 'bg-hairline-strong' : 'bg-reward';
  const idle = phase === 'closed' && !reduced;
  const lit = phase !== 'spent';
  return (
    <motion.div
      className={`relative mx-auto h-44 w-32 ${onClick ? 'cursor-pointer' : ''}`}
      aria-hidden="true"
      onClick={onClick}
      animate={
        phase === 'opening' && !reduced
          ? streakFlame
          : idle
            ? { y: [0, -7, 0], rotate: 0, scale: 1, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }
            : { y: 0, rotate: 0, scale: 1 }
      }
      whileHover={onClick && !reduced ? { scale: 1.07 } : undefined}
      data-testid="mb-art"
      data-phase={phase}
    >
      {lit && (
        <motion.div
          className="pointer-events-none absolute -inset-12 -z-0 rounded-full"
          style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--reward) 38%, transparent), transparent)' }}
          initial={false}
          animate={
            reduced
              ? { opacity: open ? 0.9 : 0.5 }
              : { opacity: open ? [0.7, 1, 0.7] : [0.35, 0.65, 0.35], scale: open ? [1, 1.12, 1] : [1, 1.06, 1] }
          }
          transition={{ duration: open ? 1.8 : 2.4, repeat: reduced ? 0 : Infinity, ease: 'easeInOut' }}
          data-testid="mb-glow"
        />
      )}
      {open && (
        <motion.div
          className="absolute left-1/2 top-0 z-0 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-pill bg-reward"
          initial={reduced ? false : { y: 56, opacity: 0, scale: 0.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ ...slide, delay: 0.12 }}
        >
          <motion.span
            className="flex"
            animate={reduced ? undefined : { rotate: [0, -12, 12, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          >
            <Star size={24} className="text-action-ink" fill="currentColor" />
          </motion.span>
        </motion.div>
      )}
      <div className={`absolute bottom-0 left-0 z-10 h-[68px] w-full rounded-control border ${body}`}>
        <div className={`absolute inset-y-0 left-1/2 w-5 -translate-x-1/2 ${band}`} />
      </div>
      <motion.div
        className={`absolute bottom-[67px] -left-1.5 z-20 h-9 w-[calc(100%+12px)] origin-bottom-left rounded-control border ${body}`}
        animate={open && !reduced ? { y: -24, rotate: -8 } : open ? { y: -24 } : { y: 0, rotate: 0 }}
        transition={slide}
      >
        <div className={`absolute inset-y-0 left-1/2 w-5 -translate-x-1/2 ${band}`} />
      </motion.div>
    </motion.div>
  );
}

/** The three possible prizes; the one you won is picked out. */
function TierLadder({ won, reduced }: { won?: number; reduced: boolean }) {
  const item = reduced ? enterReduced : enter;
  return (
    <motion.ul
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mt-6 grid grid-cols-3 gap-2"
      aria-label="Possible prizes"
      data-testid="mb-tiers"
    >
      {TIERS.map(v => {
        const hit = won === v;
        return (
          <motion.li
            key={v}
            variants={item}
            data-won={hit ? 'true' : undefined}
            className={`rounded-control border p-3 text-center transition-colors duration-state ${
              hit ? 'border-reward bg-reward-soft' : 'border-hairline bg-surface-recessed'
            }`}
          >
            <p className={`font-numeral text-num-l ${hit ? 'text-reward-text' : 'text-ink-subtle'}`}>{v}</p>
            <p className="text-caption text-ink-muted">{REWARD_TITLES[v].replace(' XP', '').replace(' Cache', '')}</p>
            {hit && <p className="mt-1 text-caption text-reward-text">You won</p>}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

/**
 * Mystery Box: one free box a day. The reward is chosen and awarded by the
 * server (`claim_mystery_box`); this screen only asks and displays the result.
 * Design System v2 colours (role tokens only). Unlike the rest of the app it may use
 * confetti, a glow, looping motion and hover scale (owner exception, 2026-11-02);
 * all of it is off under reduced motion.
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
    // One per account per day at most (the server allows one box a day), so volume is tiny.
    track({
      name: 'mystery_box_opened',
      props: !result.ok
        ? { outcome: 'error' }
        : result.alreadyClaimed
          ? { outcome: 'already_claimed' }
          : { outcome: 'revealed', xp: result.xpAwarded },
    });
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
          className="relative overflow-hidden rounded-card border border-hairline bg-surface p-6 text-center md:p-8"
          aria-labelledby="mb-heading"
        >
          {box.name === 'closed' && (
            <>
              <BoxArt phase="closed" reduced={!!reduced} onClick={() => void openBox()} />
              <p className="mt-6 text-eyebrow uppercase text-ink-subtle">Daily surprise</p>
              <h2 id="mb-heading" className="mt-2 text-title text-ink">Your box is ready</h2>
              <p className="mt-2 text-body-s text-ink-muted">
                Inside: 50, 100 or a rare 250 XP. You get one every day.
              </p>
              <TierLadder reduced={!!reduced} />
              <Button size="lg" className="mt-6 w-full" onClick={() => void openBox()} data-testid="mb-open">
                <Gift size={16} aria-hidden="true" />
                Open the box
              </Button>
            </>
          )}

          {box.name === 'opening' && (
            <div role="status" aria-live="polite" data-testid="mb-opening">
              <BoxArt phase="opening" reduced={!!reduced} />
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
              {!reduced && <Confetti count={confettiCount(box.value)} />}
              <BoxArt phase="open" reduced={!!reduced} />
              <p className="mt-6 text-eyebrow uppercase text-ink-subtle">You found</p>
              <h2 id="mb-heading" className="mt-2 text-title text-ink">{box.title}</h2>
              <motion.p
                variants={celebrate}
                initial="hidden"
                animate="show"
                className="mt-4 inline-flex items-baseline rounded-pill bg-reward-soft px-5 py-2 font-numeral text-num-xl text-reward-text"
              >
                +<CountUp value={box.value} data-testid="mb-xp" delay={700} />
                <span className="ml-2 text-subtitle text-ink-muted">XP</span>
              </motion.p>
              <TierLadder won={box.value} reduced={!!reduced} />
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
              <BoxArt phase="spent" reduced={!!reduced} />
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
