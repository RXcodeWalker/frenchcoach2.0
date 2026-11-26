import { motion } from 'framer-motion';
import { ChevronRight, Info, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import { fadeUp, stagger } from '../../components/motion/variants';
import { TOPICS } from '../../data/topics';
import { DRILL_ROUNDS_S, summarizeDrill, type DrillRecord, type FirstTakeTrend, MIN_DRILLS_FOR_TREND } from '../../domain/fluency/drill432';
import { MIN_TREND_SAMPLES, PROFILE_MEASURES, type FluencyProfile } from '../../domain/fluency/fluencyProfile';
import { ChangeList } from './ChangeList';
import { FlowChart } from './FlowChart';
import {
  DRILL_CARD_NOTE,
  DRILL_HEADLINE,
  DRILL_TITLE,
  FIRST_TAKE_TITLE,
  FLOW_NOT_A_GRADE,
  HISTORY_EMPTY,
  HISTORY_TITLE,
  MEASURE_DISPLAY,
  NO_AI_NOTE,
  NO_WORDS_HEARD,
  START_DELAY_HELP,
  START_DELAY_LABEL,
  TOPICS_HELP,
  TOPICS_TITLE,
  UNVALIDATED_NOTE,
  VIEW_EMPTY,
  VIEW_EMPTY_TITLE,
  VIEW_INTRO,
  drillSuggestion,
  firstTakeLine,
  firstTakeWaiting,
  formatMeasure,
  nowCaption,
  trendCaption,
  trendWaiting,
} from './fluencyCopy';

/**
 * The fluency view (fluency-trainer §2): how smoothly the learner speaks in
 * Learn, from the speaking log, plus the way into the 4-3-2 drill and its
 * history. The honesty note is the first thing on the page, above any number.
 */

interface Props {
  profile: FluencyProfile;
  drills: DrillRecord[];
  firstTake: FirstTakeTrend | null;
  onStartDrill: (topicKey?: string) => void;
}

const topicLabel = (key: string) => TOPICS.find((t) => t.key === key)?.labelEn ?? key;

function Card({ children, labelledBy, testId }: { children: ReactNode; labelledBy: string; testId?: string }) {
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby={labelledBy}
      data-testid={testId}
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(16px,3cqw,24px)]"
    >
      {children}
    </motion.section>
  );
}

export function HonestyNote() {
  return (
    <div className="flex gap-3 rounded-card border border-hairline bg-info-soft p-4" data-testid="fluency-honesty">
      <Info size={18} className="mt-0.5 shrink-0 text-info-text" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-body-s font-semibold text-ink">{FLOW_NOT_A_GRADE}</p>
        <p className="text-body-s text-ink-muted">{UNVALIDATED_NOTE}</p>
      </div>
    </div>
  );
}

function NowTiles({ profile }: { profile: FluencyProfile }) {
  const tiles = [
    ...PROFILE_MEASURES.map((m) => ({ key: m, label: MEASURE_DISPLAY[m].label, value: formatMeasure(m, profile.now[m]), unit: MEASURE_DISPLAY[m].unit, help: MEASURE_DISPLAY[m].help })),
    { key: 'startDelay', label: START_DELAY_LABEL, value: profile.startDelayS === null ? '–' : profile.startDelayS.toFixed(1), unit: 's', help: START_DELAY_HELP },
  ];
  return (
    <dl className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr))]">
      {tiles.map((t) => (
        <div key={t.key} className="flex flex-col gap-1 rounded-control surface-recessed p-3" data-testid={`now-${t.key}`}>
          <dt className="text-caption font-semibold text-ink-muted">{t.label}</dt>
          <dd className="flex items-baseline gap-1">
            <span className="font-numeral text-num-m text-ink">{t.value}</span>
            <span className="text-caption text-ink-muted">{t.unit}</span>
          </dd>
          <dd className="text-caption text-ink-subtle">{t.help}</dd>
        </div>
      ))}
    </dl>
  );
}

function DrillHistory({ drills, firstTake }: { drills: DrillRecord[]; firstTake: FirstTakeTrend | null }) {
  const latest = [...drills].reverse().slice(0, 6);
  return (
    <Card labelledBy="fluency-drills" testId="fluency-drill-history">
      <h2 id="fluency-drills" className="text-section text-ink">{HISTORY_TITLE}</h2>
      {drills.length === 0 ? (
        <p className="text-body-s text-ink-muted">{HISTORY_EMPTY}</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h3 className="text-eyebrow uppercase text-ink-subtle">{FIRST_TAKE_TITLE}</h3>
            <p className="text-body-s text-ink-muted" data-testid="fluency-first-take">
              {firstTake ? firstTakeLine(firstTake.change.direction, firstTake.drills) : firstTakeWaiting(MIN_DRILLS_FOR_TREND)}
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-hairline">
            {latest.map((d) => {
              const s = summarizeDrill(d.rounds);
              const speed = s.changes.find((c) => c.measure === 'wordsPerMinute');
              return (
                <li key={d.id} className="flex flex-col gap-0.5 py-2.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold text-ink">{d.topicKey ? topicLabel(d.topicKey) : DRILL_TITLE}</span>
                    <span className="text-caption text-ink-subtle">{new Date(d.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <span className="text-caption text-ink-muted">
                    {speed
                      ? `${MEASURE_DISPLAY.wordsPerMinute.label}: ${formatMeasure('wordsPerMinute', speed.before)} → ${formatMeasure('wordsPerMinute', speed.after)} ${MEASURE_DISPLAY.wordsPerMinute.unit}`
                      : DRILL_HEADLINE[s.headline]}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

export function FluencyView({ profile, drills, firstTake, onStartDrill }: Props) {
  const empty = profile.measured === 0;
  const noWords = !empty && profile.now.wordsPerMinute === null;

  return (
    <motion.div className="flex flex-col gap-6" variants={stagger} initial="hidden" animate="show" data-testid="fluency-view">
      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <h1 className="text-h2 text-ink">Your speaking flow</h1>
        <p className="text-body-l text-ink-muted">{VIEW_INTRO}</p>
      </motion.div>

      <motion.div variants={fadeUp}><HonestyNote /></motion.div>

      <motion.button
        type="button"
        variants={fadeUp}
        onClick={() => onStartDrill(profile.slowestTopic ?? undefined)}
        data-testid="fluency-start-drill"
        className="flex items-center gap-4 rounded-card border border-action bg-action-soft p-5 text-left text-ink
          transition-colors duration-state ease-smooth active:bg-surface-recessed"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-action text-action-ink" aria-hidden="true">
          <Timer size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-semibold">{DRILL_TITLE}</span>
          <span className="text-[13px] text-ink-muted">
            {profile.slowestTopic ? drillSuggestion(topicLabel(profile.slowestTopic)) : DRILL_CARD_NOTE}
          </span>
          <span className="text-caption text-ink-subtle">{DRILL_ROUNDS_S.map((s) => `${s} s`).join(' → ')} · {NO_AI_NOTE}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden="true" />
      </motion.button>

      {empty ? (
        <Card labelledBy="fluency-empty" testId="fluency-empty">
          <h2 id="fluency-empty" className="text-section text-ink">{VIEW_EMPTY_TITLE}</h2>
          <p className="text-body-s text-ink-muted">{VIEW_EMPTY}</p>
        </Card>
      ) : (
        <>
          <Card labelledBy="fluency-now" testId="fluency-now">
            <div className="flex flex-col gap-1">
              <h2 id="fluency-now" className="text-section text-ink">Right now</h2>
              <p className="text-caption text-ink-muted">{nowCaption(profile.nowAnswers)}</p>
            </div>
            {noWords && <p className="text-body-s text-ink-muted">{NO_WORDS_HEARD}</p>}
            <NowTiles profile={profile} />
          </Card>

          <Card labelledBy="fluency-trend" testId="fluency-trend">
            <div className="flex flex-col gap-1">
              <h2 id="fluency-trend" className="text-section text-ink">Your trend</h2>
              <p className="text-caption text-ink-muted">
                {profile.trend ? trendCaption(profile.trend.answers) : trendWaiting(profile.measured, MIN_TREND_SAMPLES * 2)}
              </p>
            </div>
            {profile.trend && profile.trend.changes.length > 0 && <ChangeList changes={profile.trend.changes} testId="fluency-trend-changes" />}
            <FlowChart series={profile.series} />
          </Card>

          {profile.topics.length > 0 && (
            <Card labelledBy="fluency-topics" testId="fluency-topics">
              <div className="flex flex-col gap-1">
                <h2 id="fluency-topics" className="text-section text-ink">{TOPICS_TITLE}</h2>
                <p className="text-caption text-ink-muted">{TOPICS_HELP}</p>
              </div>
              <ul className="flex flex-col divide-y divide-hairline">
                {profile.topics.map((t) => (
                  <li key={t.topicKey} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 text-[14px] text-ink">{topicLabel(t.topicKey)}</span>
                    <span className="text-caption text-ink-subtle">{t.answers} answers</span>
                    <span className="w-24 text-right text-[14px] text-ink">
                      <span className="font-numeral">{formatMeasure('wordsPerMinute', t.wordsPerMinute)}</span>
                      <span className="text-caption text-ink-muted"> wpm</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onStartDrill(t.topicKey)}
                      aria-label={`Start a 4-3-2 drill on ${topicLabel(t.topicKey)}`}
                      className="rounded-control px-2 py-1 text-label text-action-text hover:bg-track"
                    >
                      Drill
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <DrillHistory drills={drills} firstTake={firstTake} />
    </motion.div>
  );
}
