import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import type { CheckTrend, MonthlyCheckResult } from '../../domain/pronunciation/lab/monthlyCheck';
import { totals } from '../../domain/pronunciation/lab/monthlyCheck';
import type { ScoredFamilyId } from '../../domain/pronunciation/lab/soundFamilies';
import type { SoundProgress } from '../../domain/pronunciation/lab/soundProgress';
import { SOUND_TIPS } from '../../domain/pronunciation/lab/tips';
import { SOUNDS_CARD, clearHeadline, dayLabel, monthLabel, trendLine } from '../../features/pronunciation/labCopy';

/** Where the monthly check lives (App.tsx; behind the `pronunciationLab` flag). */
export const MONTHLY_CHECK_PATH = '/learn/sounds/check';

interface Props {
  progress: SoundProgress;
  latest: MonthlyCheckResult | null;
  trend: CheckTrend | null;
  /** No check has been finished in the current calendar month. */
  checkDue: boolean;
  /** Today's local YYYY-MM-DD (the month the next check is due in comes from it). */
  today: string;
  /** Signed in (guests can't have their words checked). */
  signedIn: boolean;
}

function FamilyList({ title, glyph, chip, families }: { title: string; glyph: string; chip: string; families: ScoredFamilyId[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-eyebrow uppercase text-ink-subtle">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {families.map((f) => (
          <li key={f} className={`inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[14px] ${chip}`}>
            <span aria-hidden="true" className="text-[13px] font-semibold">{glyph}</span>
            {SOUND_TIPS[f].name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Your French sounds" (pronunciation-lab plan §3.4): the two strongest sound
 * families, the two worth working on, and the monthly check. The only numbers on
 * it are the monthly check's "N of M words clear" — nothing here is a score.
 */
export function SoundsCard({ progress, latest, trend, checkDue, today, signedIn }: Props) {
  const navigate = useNavigate();
  const named = progress.strongest.length > 0 || progress.workOn.length > 0;
  const nextMonth = (() => {
    const [y, m] = today.split('-').map(Number);
    return monthLabel(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`);
  })();
  const latestTotals = latest ? totals(latest.sentences) : null;
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="progress-sounds"
      className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]"
      data-testid="progress-sounds"
    >
      <h2 id="progress-sounds" className="text-section text-ink">{SOUNDS_CARD.title}</h2>

      {named ? (
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {progress.strongest.length > 0 && (
            <FamilyList title={SOUNDS_CARD.strongest} glyph="✓" chip="bg-progress-soft text-progress-text" families={progress.strongest} />
          )}
          {progress.workOn.length > 0 && (
            <FamilyList title={SOUNDS_CARD.workOn} glyph="●" chip="bg-correction-soft text-correction-text" families={progress.workOn} />
          )}
        </div>
      ) : (
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">
          {!signedIn ? SOUNDS_CARD.signedOut : progress.measured === 0 && !latest ? SOUNDS_CARD.empty : SOUNDS_CARD.gettingMore}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-hairline pt-4">
        <h3 className="text-eyebrow uppercase text-ink-subtle">Monthly check</h3>
        {latest && latestTotals && (
          <p className="text-body-s text-ink">
            <span className="font-numeral">{clearHeadline(latestTotals)}</span>
            <span className="text-ink-muted"> · {dayLabel(latest.day)}</span>
          </p>
        )}
        {trend && <p className="text-body-s text-progress-text">{trendLine(trend)}</p>}
        {latest && !trend && <p className="text-caption text-ink-muted">Do it again next month and the two checks appear side by side.</p>}
        {checkDue ? (
          <div className="flex flex-col items-start gap-2">
            {!latest && <p className="text-body-s text-ink-muted">Five short sentences, once a month — the fair way to see your pronunciation change.</p>}
            <Button variant="secondary" size="sm" onClick={() => navigate(MONTHLY_CHECK_PATH)} data-testid="progress-sounds-check">
              {SOUNDS_CARD.checkDue}
            </Button>
          </div>
        ) : (
          <p className="text-caption text-ink-muted">{SOUNDS_CARD.checkDone}. Your next one is in {nextMonth}.</p>
        )}
      </div>
    </motion.section>
  );
}
