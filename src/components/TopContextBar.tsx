import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Flame, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useCatalogue } from '../services/shop/useCatalogue';
import { Stat } from './ui/Stat';
import { UserAvatar } from './ui/UserAvatar';
import { CountUp } from './motion/CountUp';
import { streakFlame, streakRoll } from './motion/variants';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
}

// The XP and streak the bar last showed, across screens. When a session ends
// and the learner lands back on a screen with the bar, the XP counts up from
// the old total (`celebrate`) and the streak number rolls (`streak`). Starts
// null so the first paint after load never animates.
let lastShown: { xp: number; streak: number } | null = null;

/**
 * The 56px top bar card (Design System v2): page title and subtitle on the
 * left (optional back button), then the streak pill, the XP pill and — on
 * desktop — the avatar that links to Profile. Sticky above the scrolling page.
 */
export function TopContextBar({ title, subtitle, showBack, onBack, backLabel = 'Back', actions }: Props) {
  const navigate = useNavigate();
  const { state } = useApp();
  const { profile } = state;
  const catalogue = useCatalogue();
  const reduced = useReducedMotion();

  const xp = profile.total_xp;
  const streak = profile.streak_days;
  const prev = useRef(lastShown);
  useEffect(() => {
    lastShown = { xp, streak };
  }, [xp, streak]);

  const xpFrom = prev.current && prev.current.xp < xp ? prev.current.xp : xp;
  const prevStreak = prev.current?.streak ?? streak;
  const rolled = !reduced && prev.current !== null && prevStreak !== streak && streak > 0;

  return (
    <div className="sticky top-0 z-40 w-full bg-bg px-3 pt-3">
      <div className="flex h-14 items-center justify-between gap-3 rounded-card border border-hairline bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2">
          {showBack && (
            <button
              type="button"
              onClick={onBack || (() => navigate(-1))}
              aria-label={backLabel}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-hairline-strong text-ink-muted
                transition-[background-color,color,transform] duration-state ease-smooth hover:bg-track hover:text-ink active:scale-[.97]"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          )}
          <div className="flex min-w-0 flex-col pl-2">
            <h1 className="text-[14px] font-semibold leading-[1.3] text-ink">{title}</h1>
            {subtitle && <p className="truncate text-[13px] font-normal leading-[1.3] text-ink-subtle">{subtitle}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {streak > 0 ? (
            <Stat
              role="streak"
              title="Day streak"
              icon={rolled ? <motion.span className="inline-flex" animate={streakFlame}><Flame size={14} /></motion.span> : <Flame size={14} />}
            >
              {rolled ? (
                <span className="inline-block h-5 overflow-hidden leading-5">
                  <motion.span className="flex flex-col" initial={{ y: 0 }} animate={{ y: -20 }} transition={streakRoll}>
                    <span>{prevStreak}</span>
                    <span>{streak}</span>
                  </motion.span>
                </span>
              ) : (
                streak
              )}
            </Stat>
          ) : (
            <Stat role="neutral" title="Day streak" icon={<Flame size={14} />}>0</Stat>
          )}
          <Stat role="reward" title="Total XP" icon={<Zap size={14} />}>
            <CountUp value={xp} from={xpFrom} grouped delay={420} />
          </Stat>

          {actions ?? (
            <div className="hidden items-center md:flex">
              <span className="mx-1 h-6 w-px bg-hairline" aria-hidden="true" />
              <button
                type="button"
                onClick={() => navigate('/profile')}
                aria-label="Profile"
                className="rounded-pill transition-colors duration-state ease-smooth"
              >
                <UserAvatar username={profile.username} equipped={profile.equipped} catalogue={catalogue} size={36} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
