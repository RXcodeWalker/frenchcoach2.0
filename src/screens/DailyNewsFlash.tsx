/**
 * Daily News Flash — "Le Journal" (docs/systems/daily-news.md).
 *
 * One hand-written story a day, at three levels: Listen (Henri's recorded
 * voice, sentence by sentence) → Check (three listening questions) → Report
 * (retell it as the news anchor, facts lit as they're heard) → Your take
 * (optional opinion) → Review. XP is earned once per edition-day; the streak
 * and the archive are derived from the session history.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Ear, Eye, Lock, Newspaper, RotateCcw, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { SpeakingConsentGate } from '../components/SpeakingConsentGate';
import { useRecording } from '../features/recording/useRecording';
import { RecordingPanel } from './learn/RecordingPanel';
import { FeedbackPanel } from './learn/FeedbackPanel';
import { getAIFeedback } from '../services/api/apiClient';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { enter, enterReduced, stagger } from '../components/motion/variants';
import { categoryHue } from '../features/explore/featureVisuals';
import { NEWS_EDITIONS } from '../data/news';
import { editionForDay, recentDays } from '../data/news/rotation';
import type { NewsEdition, NewsLevelId } from '../data/news/types';
import { NewsPlayer } from '../features/news/NewsPlayer';
import { useBroadcast } from '../features/news/useBroadcast';
import { StoryTranscript } from '../features/news/StoryTranscript';
import { ComprehensionCheck } from '../features/news/ComprehensionCheck';
import { FactChecklist } from '../features/news/FactChecklist';
import { BroadcastReplay } from '../features/news/BroadcastReplay';
import { WeekStrip } from '../features/news/WeekStrip';
import { matchFacts } from '../features/news/matchFacts';
import {
  defaultNewsLevel, earnsXp, isNewsLevel, newsContentId, newsDays, newsScore, newsStreak,
} from '../features/news/newsProgress';
import type { FeedbackV2, Question, Session } from '../types';
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '../services/persistence/storage';
import { awardXP, checkAchievements, getProgressionState } from '../services/progression/progressionService';
import { getSessionHistory, recordSession as persistSession } from '../services/analytics/analyticsService';
import { buildAchievementContext } from '../services/coach/achievementContextBuilder';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { localDay } from '../lib/localDay';

type Phase = 'listen' | 'check' | 'report' | 'opinion' | 'processing' | 'review';

/** How far back the archive reaches (daily-news §6). */
export const ARCHIVE_DAYS = 14;

const LEVEL_OPTIONS: { id: NewsLevelId; label: string; note: string }[] = [
  { id: 'a2', label: 'Easier', note: 'A2' },
  { id: 'b1', label: 'Standard', note: 'B1' },
  { id: 'b2', label: 'Harder', note: 'B2' },
];

const STEPS: Array<{ id: 'listen' | 'check' | 'report' | 'review'; label: string }> = [
  { id: 'listen', label: 'Listen' },
  { id: 'check', label: 'Check' },
  { id: 'report', label: 'Report' },
  { id: 'review', label: 'Review' },
];

function stepOf(phase: Phase): (typeof STEPS)[number]['id'] {
  if (phase === 'opinion' || phase === 'processing') return 'report';
  return phase;
}

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Listen → Check → Report → Review, as a quiet four-step track. */
function StepTrack({ phase }: { phase: Phase }) {
  const at = STEPS.findIndex(s => s.id === stepOf(phase));
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((step, i) => {
        const done = i < at;
        const current = i === at;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-caption font-semibold font-numeral
                transition-colors duration-state ease-smooth
                ${done ? 'bg-progress-soft text-progress-text' : current ? 'bg-action text-action-ink' : 'bg-track text-ink-subtle'}`}
            >
              {done ? <Check size={12} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`hidden text-label sm:inline ${current ? 'text-ink' : done ? 'text-ink-muted' : 'text-ink-subtle'}`}>{step.label}</span>
            {current && <span className="text-label text-ink sm:hidden">{step.label}</span>}
            {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px flex-1 bg-hairline" />}
          </li>
        );
      })}
    </ol>
  );
}

interface Result {
  covered: string[];
  checkCorrect: number;
  score: number;
  /** XP actually awarded; 0 on a replay of an edition-day already finished. */
  xp: number;
  practiceRun: boolean;
  earOnly: boolean;
}

export function DailyNewsFlash() {
  const [params] = useSearchParams();
  const today = localDay();
  const asked = params.get('day');
  const day = asked && asked !== today && recentDays(today, ARCHIVE_DAYS + 1).includes(asked) ? asked : today;
  // A new day (archive link) is a new edition: remount so every step starts over.
  return <NewsEditionScreen key={day} day={day} today={today} />;
}

function NewsEditionScreen({ day, today }: { day: string; today: string }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const { state, dispatch } = useApp();
  const { consentStatus } = useAuth();
  const recording = useRecording(consentStatus === 'pending');

  const edition: NewsEdition = useMemo(() => editionForDay(day, NEWS_EDITIONS), [day]);
  const [level, setLevelState] = useState<NewsLevelId>(() => {
    const stored = storageGet<unknown>(STORAGE_KEYS.newsLevel, null);
    return isNewsLevel(stored) ? stored : defaultNewsLevel(state.markingLevel);
  });
  const lvl = edition.levels[level];
  const sentenceTexts = useMemo(() => lvl.sentences.map(s => s.fr), [lvl]);

  const [phase, setPhase] = useState<Phase>('listen');
  const [stopSignal, setStopSignal] = useState(0);
  const broadcast = useBroadcast(sentenceTexts, stopSignal);
  const [showTranscript, setShowTranscript] = useState(false);
  const [openedTranscript, setOpenedTranscript] = useState(false);
  const [checkCorrect, setCheckCorrect] = useState(0);
  const [report, setReport] = useState<{ transcript: string; blob: Blob | null; seconds: number } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackV2 | null>(null);
  const [feedbackFailed, setFeedbackFailed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState(() => getSessionHistory());
  const finishing = useRef(false);

  useEffect(() => {
    // The AI-written edition's cache (retired 2026-11-11).
    storageRemove(STORAGE_KEYS.legacyNewsCache);
  }, []);

  const week = useMemo(() => newsDays(history, today, NEWS_EDITIONS, 7), [history, today]);
  const streak = useMemo(() => newsStreak(history, today, NEWS_EDITIONS), [history, today]);
  const archive = useMemo(
    () => newsDays(history, today, NEWS_EDITIONS, ARCHIVE_DAYS + 1).filter(d => d.day !== today && d.day !== day).reverse(),
    [history, today, day],
  );
  const contentId = newsContentId(edition.id, day);
  const doneBefore = !earnsXp(history, contentId);
  const isArchive = day !== today;

  const setLevel = (l: NewsLevelId) => {
    setLevelState(l);
    storageSet(STORAGE_KEYS.newsLevel, l);
  };

  const stopAudio = () => setStopSignal(n => n + 1);
  const transcriptUnlocked = broadcast.listened || broadcast.unavailable;

  const revealTranscript = () => {
    setShowTranscript(true);
    setOpenedTranscript(true);
  };

  const goCheck = () => {
    stopAudio();
    setPhase('check');
  };

  const onCheckDone = (correct: number) => {
    stopAudio();
    setCheckCorrect(correct);
    setPhase('report');
  };

  const handleReportStop = async () => {
    const seconds = recording.elapsedTime;
    const transcript = await recording.stop();
    const blob = await recording.audioBlobPromise().catch(() => null);
    setReport({ transcript, blob, seconds });
    setPhase('opinion');
  };

  const finish = async (opinion: string, opinionSeconds: number) => {
    if (!report || finishing.current) return;
    finishing.current = true;
    stopAudio();
    setPhase('processing');

    const full = [report.transcript, opinion].map(t => t.trim()).filter(Boolean).join(' ');
    const facts = matchFacts(report.transcript, lvl.facts);
    const score = newsScore(checkCorrect, lvl.check.length, facts.covered.length, lvl.facts.length);
    const first = earnsXp(getSessionHistory(), contentId);
    const question: Question = {
      id: `${edition.id}-${level}`,
      text: opinion
        ? `Résumez cette nouvelle : « ${lvl.headline} ». Puis : ${lvl.opinion.fr}`
        : `Résumez cette nouvelle : « ${lvl.headline} »`,
      topicKey: 'news',
      hint: 'Qui ? Quoi ? Où ? Quand ?',
      difficulty: level === 'a2' ? 1 : level === 'b1' ? 2 : 3,
      followUps: [lvl.opinion.fr],
      modelAnswer: lvl.modelRetell,
      keyVocab: lvl.glossary.map(g => ({ fr: g.fr, en: g.en })),
    };

    let fb: FeedbackV2 | null = null;
    if (full) {
      try {
        fb = await getAIFeedback(full, question, undefined, report.blob ?? undefined);
      } catch (error) {
        console.error('Daily News feedback unavailable:', error);
      }
    }

    const session: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: 'daily_news',
      topicKey: 'news',
      questionText: question.text,
      transcript: full,
      wordCount: wordCount(full),
      score,
      xpEarned: 0,
      durationSec: Math.max(1, Math.round(report.seconds + opinionSeconds)),
      feedback: fb ?? undefined,
      createdAt: new Date().toISOString(),
      contentId,
    };

    let xp = 0;
    if (first) {
      const xpResult = awardXP(score, state.profile.streak_days, 'daily_news');
      xp = xpResult.gain;
      persistSession({ ...session, xpEarned: xp });
      const { level: newLevel } = getProgressionState();
      const newUnlockedAchievementIds = checkAchievements(
        buildAchievementContext({
          finalScore: score,
          streakDays: state.profile.streak_days,
          totalSessionsAfter: state.profile.sessions_count + 1,
          topicsUsed: [],
          beliefSnapshot: null,
          examCompleted: false,
          examType: null,
        }),
      );
      dispatch({ type: 'ADD_SESSION', session: { ...session, xpEarned: xp }, xpResult, newUnlockedAchievementIds, newLevelName: newLevel.name });
    } else {
      // A replay of an edition-day already finished: kept in the history, no XP (daily-news §4).
      persistSession(session);
    }

    if (fb) {
      observeAttempt({
        sessionId: session.id,
        question,
        feedback: fb,
        transcript: full,
        finalScore: score,
        mode: 'daily-news',
        topicKey: 'news',
      });
      dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });
    }

    setFeedback(fb);
    setFeedbackFailed(Boolean(full) && !fb);
    setResult({ covered: facts.covered, checkCorrect, score, xp, practiceRun: !first, earOnly: !openedTranscript });
    setHistory(getSessionHistory());
    setPhase('review');
    finishing.current = false;
  };

  const handleOpinionStop = async () => {
    const seconds = recording.elapsedTime;
    const transcript = await recording.stop();
    await finish(transcript, seconds);
  };

  const restart = (nextLevel?: NewsLevelId) => {
    stopAudio();
    if (nextLevel) setLevel(nextLevel);
    setPhase('listen');
    setShowTranscript(false);
    setOpenedTranscript(false);
    setReport(null);
    setFeedback(null);
    setFeedbackFailed(false);
    setResult(null);
    setCheckCorrect(0);
  };

  const liveFacts = phase === 'report' ? matchFacts(recording.transcript, lvl.facts).covered : [];
  const busy = recording.isRecording || phase === 'processing';
  const chipStyle = { '--h': categoryHue('Speak & Listen') } as CSSProperties;
  const nextLevel: NewsLevelId | null = level === 'a2' ? 'b1' : level === 'b1' ? 'b2' : null;
  const missedSentences = result
    ? new Set(lvl.facts.filter(f => !result.covered.includes(f.id)).map(f => f.sentence))
    : undefined;

  return (
    <>
      <TopContextBar
        title="Le Journal du Jour"
        subtitle="Listen, check, then report the news in French"
        showBack
        backLabel="Back to Explore"
        onBack={() => navigate('/explore')}
      />

      <PageShell maxWidth="md" gap={16}>
        <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-headline">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="topic-chip flex h-10 w-10 shrink-0 items-center justify-center text-xl" style={{ ...chipStyle, borderRadius: 8 }}>
              {edition.emoji || <Newspaper size={20} strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-eyebrow uppercase text-ink-subtle">
                {isArchive ? 'From the archive' : 'Today’s edition'} · {formatDay(day)}
              </p>
              <h2 id="news-headline" lang="fr" className="mt-1 text-title text-ink">{lvl.headline}</h2>
              {doneBefore && phase !== 'review' && (
                <p className="mt-1 inline-flex items-center gap-1 text-caption text-progress-text">
                  <Check size={12} aria-hidden="true" /> You’ve already reported this one. Replays are practice (no XP).
                </p>
              )}
            </div>
          </div>
          {phase === 'listen' && (
            <div className="mt-5">
              <Segmented<NewsLevelId>
                label="Story level"
                height={48}
                value={level}
                onChange={l => {
                  stopAudio();
                  setLevel(l);
                }}
                options={LEVEL_OPTIONS.map(o => ({ id: o.id, label: o.label, note: o.note }))}
              />
            </div>
          )}
          <div className="mt-5">
            <StepTrack phase={phase} />
          </div>
          {!isArchive && (
            <div className="mt-5 border-t border-hairline pt-4">
              <WeekStrip days={week} today={today} streak={streak} />
            </div>
          )}
        </motion.section>

        {phase === 'listen' && (
          <motion.div key="listen" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-listen">
              <h2 id="news-listen" className="text-section text-ink">Listen to the story</h2>
              <p className="mt-1 text-body-s text-ink-muted">
                Play it as often as you like. Listen for the main facts: who, what, where, when.
              </p>

              <div className="mt-4">
                <p className="text-eyebrow uppercase text-ink-subtle">Words to know</p>
                <WordChips glossary={lvl.glossary} />
              </div>

              <div className="mt-5">
                <NewsPlayer broadcast={broadcast} sentenceCount={sentenceTexts.length} />
              </div>

              <div className="mt-6 border-t border-hairline pt-5">
                {showTranscript ? (
                  <div>
                    <p className="text-eyebrow uppercase text-ink-subtle">Transcript</p>
                    <div className="mt-2 rounded-control bg-surface-recessed p-2">
                      <StoryTranscript sentences={lvl.sentences} glossary={lvl.glossary} current={broadcast.current} onPlaySentence={broadcast.playSentence} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-body-s text-ink-muted">
                      {transcriptUnlocked ? 'Want to read along? It’s free. Reports done by ear alone get an “Ear-only” badge.' : 'Listen once all the way through to unlock the transcript.'}
                    </p>
                    <Button variant="secondary" size="sm" onClick={revealTranscript} disabled={!transcriptUnlocked} className="shrink-0" data-testid="news-reveal">
                      {transcriptUnlocked ? <Eye size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />} Show transcript
                    </Button>
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-label text-ink">Got the story?</p>
                  <p className="text-body-s text-ink-muted">Three quick questions, then you report it.</p>
                </div>
                <Button size="lg" onClick={goCheck} className="sm:min-w-48" data-testid="news-start">
                  I’m ready <ChevronRight size={18} aria-hidden="true" />
                </Button>
              </div>
            </motion.section>

            {archive.length > 0 && (
              <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6" aria-labelledby="news-archive">
                <h2 id="news-archive" className="text-label text-ink">{isArchive ? 'More editions' : 'Missed one? Past editions'}</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="news-archive">
                  {isArchive && (
                    <li>
                      <Link to="/daily-news" className="flex min-h-11 items-center gap-3 rounded-control border border-hairline px-3 py-2 hover:bg-track">
                        <span aria-hidden="true">📰</span>
                        <span className="min-w-0 flex-1 text-body-s text-ink">Back to today’s edition</span>
                      </Link>
                    </li>
                  )}
                  {archive.slice(0, isArchive ? 5 : 6).map(d => (
                    <li key={d.day}>
                      <Link
                        to={`/daily-news?day=${d.day}`}
                        className="flex min-h-11 items-center gap-3 rounded-control border border-hairline px-3 py-2 hover:bg-track"
                      >
                        <span aria-hidden="true">{d.edition.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span lang="fr" className="block truncate text-body-s text-ink">{d.edition.levels[level].headline}</span>
                          <span className="block text-caption text-ink-subtle">{formatDay(d.day)}</span>
                        </span>
                        {d.done && <Check size={16} className="shrink-0 text-progress-text" aria-label="Done" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </motion.div>
        )}

        {phase === 'check' && (
          <motion.section key="check" variants={item} initial="hidden" animate="show" className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-check">
            <h2 id="news-check" className="text-section text-ink">Did you catch it?</h2>
            <p className="mt-1 text-body-s text-ink-muted">Your first answer counts. Miss one and you can hear that sentence again.</p>
            <div className="mt-5">
              <ComprehensionCheck checks={lvl.check} onReplay={broadcast.playSentence} onDone={onCheckDone} />
            </div>
          </motion.section>
        )}

        {phase === 'report' && (
          <motion.div key="report" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-report">
              <p className="text-eyebrow uppercase text-ink-subtle">You’re on air</p>
              <h2 id="news-report" className="mt-1 text-section text-ink">Present the news in French</h2>
              <p className="mt-1 text-body-s text-ink-muted">
                Open like a newsreader: <span lang="fr" className="text-ink">« Bonsoir, voici les infos… »</span> Then give the facts in your own words. Aim for 30–45 seconds.
              </p>
              <div className="mt-5">
                <FactChecklist facts={lvl.facts} covered={liveFacts} mode="live" />
              </div>
            </motion.section>

            <motion.div variants={item}>
              <SpeakingConsentGate>
                <RecordingPanel isActive={true} recording={recording} onStop={handleReportStop} hint="Tap and present the story" lengthMeter={false} />
              </SpeakingConsentGate>
            </motion.div>

            <motion.div variants={item} className="flex justify-center">
              <Button variant="quiet" size="md" onClick={() => { stopAudio(); setPhase('listen'); }} disabled={busy}>
                Listen to the story again
              </Button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'opinion' && (
          <motion.div key="opinion" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-opinion">
              <p className="text-eyebrow uppercase text-ink-subtle">Your take · optional</p>
              <h2 id="news-opinion" lang="fr" className="mt-1 text-section text-ink">{lvl.opinion.fr}</h2>
              <p className="mt-1 text-body-s text-ink-muted">{lvl.opinion.en} Give a reason: that’s what examiners listen for.</p>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Sentence starters">
                {lvl.starters.map(s => (
                  <li key={s} lang="fr" className="inline-flex min-h-8 items-center rounded-pill border border-hairline-strong px-3 text-label text-ink-muted">{s}</li>
                ))}
              </ul>
            </motion.section>
            <motion.div variants={item}>
              <SpeakingConsentGate>
                <RecordingPanel isActive={true} recording={recording} onStop={handleOpinionStop} hint="Tap and give your opinion" lengthMeter={false} />
              </SpeakingConsentGate>
            </motion.div>
            <motion.div variants={item} className="flex justify-center">
              <Button variant="quiet" size="md" onClick={() => void finish('', 0)} disabled={busy} data-testid="news-skip-opinion">
                Skip, show my results
              </Button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'processing' && (
          <section className="rounded-card border border-hairline bg-surface p-8 text-center" aria-busy="true" aria-live="polite" data-testid="news-processing">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-pill border-4 border-action border-t-transparent" aria-hidden="true" />
            <p className="mt-4 text-label text-ink">The editors are reviewing your report…</p>
          </section>
        )}

        {phase === 'review' && result && (
          <motion.div key="review" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-result">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-eyebrow uppercase text-ink-subtle">Your report</p>
                  <h2 id="news-result" className="mt-1 text-section text-ink">
                    <span className="font-numeral">{result.covered.length}</span> of <span className="font-numeral">{lvl.facts.length}</span> facts reported
                  </h2>
                  <p className="mt-1 text-body-s text-ink-muted">
                    Listening check: <span className="font-numeral text-ink">{result.checkCorrect}</span> of <span className="font-numeral">{lvl.check.length}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.earOnly && (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-progress-soft px-3 py-1 text-label text-progress-text" data-testid="news-ear-only">
                      <Ear size={14} aria-hidden="true" /> Ear-only
                    </span>
                  )}
                  {result.xp > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-reward-soft px-3 py-1 text-label text-reward-text" data-testid="news-xp">
                      <Zap size={14} aria-hidden="true" /> <span className="font-numeral">+{result.xp}</span> XP
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-pill bg-track px-3 py-1 text-label text-ink-muted" data-testid="news-practice-run">
                      Practice run · no XP
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <FactChecklist facts={lvl.facts} covered={result.covered} mode="review" sentences={lvl.sentences} onReplay={broadcast.playSentence} />
              </div>
            </motion.section>

            {report?.blob && (
              <motion.section variants={item} aria-labelledby="news-watch">
                <h2 id="news-watch" className="mb-2 text-label text-ink">Watch your broadcast</h2>
                <BroadcastReplay blob={report.blob} headline={lvl.headline} emoji={edition.emoji} date={formatDay(day)} />
              </motion.section>
            )}

            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-story">
              <h2 id="news-story" className="text-section text-ink">The story</h2>
              <p className="mt-1 text-body-s text-ink-muted">Highlighted lines hold the facts you missed.</p>
              <div className="mt-3">
                <StoryTranscript
                  sentences={lvl.sentences}
                  glossary={lvl.glossary}
                  current={broadcast.current}
                  onPlaySentence={broadcast.playSentence}
                  showEnglish
                  marked={missedSentences}
                />
              </div>
              <div className="mt-4 rounded-control bg-surface-recessed p-4">
                <p className="text-eyebrow uppercase text-ink-subtle">A model report</p>
                <p lang="fr" className="mt-1 text-body-s text-ink">{lvl.modelRetell}</p>
              </div>
            </motion.section>

            {feedback && (
              <motion.div variants={item}>
                <FeedbackPanel feedback={feedback} onComplete={() => navigate('/explore')} onRetry={() => restart()} hideActions />
              </motion.div>
            )}
            {feedbackFailed && (
              <motion.p variants={item} role="status" className="rounded-control bg-reward-soft px-4 py-3 text-body-s text-reward-text">
                Feedback on your French isn’t available right now (you may be offline or signed out). Your facts and listening results above still count.
              </motion.p>
            )}

            <motion.div variants={item} className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="lg" onClick={() => restart()} data-testid="news-retry">
                <RotateCcw size={16} aria-hidden="true" /> Try again
              </Button>
              {nextLevel && (
                <Button variant="secondary" size="lg" onClick={() => restart(nextLevel)} data-testid="news-harder">
                  Try the {LEVEL_OPTIONS.find(o => o.id === nextLevel)!.label.toLowerCase()} version
                </Button>
              )}
              <Button size="lg" onClick={() => navigate('/explore')} className="sm:min-w-40" data-testid="news-done">
                Done
              </Button>
            </motion.div>
          </motion.div>
        )}
      </PageShell>
    </>
  );
}

/** The story's glossary as chips: French first, tap for the English (pre-listening support). */
function WordChips({ glossary }: { glossary: readonly { fr: string; en: string }[] }) {
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {glossary.map(g => {
        const open = shown.has(g.fr);
        return (
          <li key={g.fr}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setShown(prev => {
                const next = new Set(prev);
                if (next.has(g.fr)) next.delete(g.fr);
                else next.add(g.fr);
                return next;
              })}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-pill border px-3 text-label transition-colors duration-state ease-smooth
                ${open ? 'border-transparent bg-action-soft text-ink' : 'border-hairline-strong text-ink-muted hover:bg-track'}`}
            >
              <span lang="fr">{g.fr}</span>
              {open && <span className="text-ink-subtle">· {g.en}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
