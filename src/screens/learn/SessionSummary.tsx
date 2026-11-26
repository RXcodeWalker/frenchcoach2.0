import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Flame, Gem, Home, MessageSquare, RotateCcw, Trophy, Zap } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TopicChip } from '../../components/ui/TopicChip';
import { enter, enterReduced, fill, stagger } from '../../components/motion/variants';
import { averageRealScores, scoreTone } from '../../domain/scoring';
import { demandPracticeCounts, practisedLine } from '../../features/learn/sessionRecap';
import { summaryHeadline } from '../../features/learn/sessionRecapCopy';
import { shownBestScore } from '../../features/learn/markingLevel';
import type { ActiveSession, SkillProfile, TopicMasteryEntry } from '../../types';
import { useSfxOnChange } from '../../services/sound/useSfx';

interface SkillDelta {
  skillId: string;
  name: string;
  before: number;
  after: number;
  delta: number;
}

interface Props {
  session: ActiveSession;
  currentSkillProfile: SkillProfile;
  topicLabel: string;
  topicKey: string;
  topicMastery: TopicMasteryEntry | null;
  onContinueTopic: () => void;
  onNewTopic: () => void;
  onHome: () => void;
}

function computeSkillDeltas(session: ActiveSession, current: SkillProfile): SkillDelta[] {
  return Object.entries(current)
    .map(([id, entry]) => {
      const before = session.skillSnapshot[id]?.score ?? 0;
      const after = entry.score;
      return { skillId: id, name: entry.name, before, after, delta: after - before };
    })
    .filter(d => Math.abs(d.delta) > 0.02)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);
}

function minutesSince(startedAt: string): number {
  return Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
}

/**
 * The end of a Learn session (Design System v2). The headline is worked out
 * from this session's own facts (`summaryHeadline`), never a fixed cheer; no
 * emoji, confetti or glow — a result screen is calm.
 */
export function SessionSummary({
  session,
  currentSkillProfile,
  topicLabel,
  topicKey,
  topicMastery,
  onContinueTopic,
  onNewTopic,
  onHome,
}: Props) {
  const reduced = useReducedMotion();
  // Neutral on purpose: the summary sounds the same however the session went.
  useSfxOnChange('complete', true, 250);
  const deltas = computeSkillDeltas(session, currentSkillProfile);
  const practised = demandPracticeCounts(session.questions);
  const completedQs = session.questions.filter(q => q.status === 'completed');
  // learn-marking §8.2 — the average is at the learner's marking level.
  const avgScore = averageRealScores(completedQs.map(shownBestScore));

  const totalWords = session.questions.reduce((a, q) => {
    const mainAttempts = q.attempts.filter(at => at.kind !== 'followup');
    const last = mainAttempts[mainAttempts.length - 1];
    return a + (last?.transcript?.split(/\s+/).filter(Boolean).length ?? 0);
  }, 0);

  const allSavedVocab = session.questions.flatMap(q => q.savedVocab);
  const topRiser = deltas.find(d => d.delta > 0)?.name ?? null;
  const { title, line } = summaryHeadline({
    topicLabel,
    answered: completedQs.length,
    avgScore,
    words: totalWords,
    minutes: minutesSince(session.startedAt),
    mastered: topicMastery?.mastered === true,
    topSkill: topRiser,
  });

  const item = reduced ? enterReduced : enter;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center overflow-y-auto bg-bg p-4 md:p-6" data-testid="session-summary">
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        aria-labelledby="session-summary-h"
        className="my-auto w-full max-w-xl"
      >
        <motion.div variants={item} className="mb-5 flex items-start gap-3.5">
          <TopicChip topicKey={topicKey} size={40} />
          <div className="min-w-0">
            <p className="text-eyebrow uppercase text-progress-text">Session complete</p>
            <h2 id="session-summary-h" className="text-title text-ink">{title}</h2>
            <p className="mt-1 text-body-s text-ink-muted">{line}</p>
          </div>
        </motion.div>

        <motion.div variants={item} className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile
            label={avgScore == null ? 'Not graded' : 'Average'}
            value={avgScore == null ? '—' : avgScore.toFixed(1)}
            valueStyle={avgScore == null ? undefined : { color: scoreTone(avgScore) }}
          />
          <StatTile label="XP" value={`+${session.xpAccumulated}`} icon={<Zap size={14} className="text-reward-text" aria-hidden="true" />} />
          <StatTile label="Best run" value={String(session.bestStreak)} icon={<Flame size={14} className="text-streak-text" aria-hidden="true" />} />
          <StatTile label="Gems" value={`+${session.gemsAccumulated}`} icon={<Gem size={14} className="text-info-text" aria-hidden="true" />} />
        </motion.div>

        {topicMastery?.mastered && (
          <motion.div variants={item} className="mb-4 flex items-center gap-3 rounded-card border border-hairline bg-reward-soft p-4">
            <Trophy size={22} className="shrink-0 text-reward-text" aria-hidden="true" />
            <div>
              <p className="text-[15px] font-semibold text-reward-text">Topic mastered</p>
              <p className="text-body-s text-reward-text">{topicLabel} is now in your mastered collection.</p>
            </div>
          </motion.div>
        )}

        {totalWords > 0 && (
          <motion.div variants={item} className="mb-4 flex items-center gap-3 rounded-card surface-recessed p-3">
            <MessageSquare size={16} className="shrink-0 text-action-text" aria-hidden="true" />
            <span className="text-body-s text-ink-muted">
              <span className="font-semibold text-ink">{totalWords}</span> words spoken this session
            </span>
          </motion.div>
        )}

        {deltas.length > 0 && (
          <motion.div variants={item} className="surface mb-4 rounded-card p-4">
            <p className="mb-3 text-eyebrow uppercase text-ink-subtle">Skills this session</p>
            <div className="grid gap-3">
              {deltas.map(d => (
                <div key={d.skillId} className="flex items-center gap-3">
                  <p className="w-28 shrink-0 truncate text-body-s text-ink-muted">{d.name}</p>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-pill bg-track">
                    <span className="absolute left-0 top-0 h-full rounded-pill bg-hairline-strong" style={{ width: `${Math.round(d.before * 100)}%` }} />
                    <motion.span
                      className={`absolute left-0 top-0 h-full rounded-pill ${d.delta > 0 ? 'bg-progress' : 'bg-correction'}`}
                      initial={{ width: `${Math.round(d.before * 100)}%` }}
                      animate={{ width: `${Math.round(d.after * 100)}%` }}
                      transition={fill(0.3)}
                    />
                  </div>
                  <span className={`w-12 shrink-0 text-right font-numeral text-[13px] ${d.delta > 0 ? 'text-progress-text' : 'text-correction-text'}`}>
                    {d.delta > 0 ? '+' : ''}{Math.round(d.delta * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {practised.length > 0 && (
          <motion.div variants={item} className="surface mb-4 rounded-card p-4">
            <p className="mb-2 text-eyebrow uppercase text-ink-subtle">What you practised</p>
            <div className="grid gap-1">
              {practised.map(p => (
                <p key={p.demand} className="text-body-s text-ink-muted">{practisedLine(p)}</p>
              ))}
            </div>
          </motion.div>
        )}

        {allSavedVocab.length > 0 && (
          <motion.div variants={item} className="mb-4 rounded-card surface-recessed p-4">
            <p className="mb-1 text-eyebrow uppercase text-ink-subtle">Saved vocabulary ({allSavedVocab.length})</p>
            <p className="text-body-s text-ink-muted">{allSavedVocab.join(' · ')}</p>
          </motion.div>
        )}

        <motion.div variants={item} className="flex flex-col gap-2 pt-1">
          <Button size="lg" className="w-full" onClick={onContinueTopic}>
            Continue {topicLabel} <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onNewTopic}>
              <RotateCcw size={16} aria-hidden="true" /> New topic
            </Button>
            <Button variant="secondary" className="flex-1" onClick={onHome}>
              <Home size={16} aria-hidden="true" /> Home
            </Button>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}

function StatTile({ label, value, icon, valueStyle }: { label: string; value: string; icon?: React.ReactNode; valueStyle?: React.CSSProperties }) {
  return (
    <div className="surface rounded-card p-3 text-center">
      <p className="font-numeral text-[22px] leading-tight text-ink" style={valueStyle}>{value}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1 text-[12px] font-semibold text-ink-muted">
        {icon}{label}
      </p>
    </div>
  );
}
