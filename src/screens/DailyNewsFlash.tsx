/**
 * Daily News Flash — "Le Journal", the daily news show (docs/systems/daily-news.md).
 *
 * One hand-written story a day, at three levels: Les titres (Henri reads it) →
 * « Intox ou info ? » (spot the changed detail) → the day's featured speaking
 * segment (L'interview, Pour ou contre, Le journaliste or Et après ?, by
 * weekday) → Review, with feedback that carries no marks. XP is earned once per
 * edition-day, for the featured segment; the story's other segments are
 * practice. The streak and the archive are derived from the session history.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Eye, Lock, Mic, Newspaper, RotateCcw, Search, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { enter, enterReduced, stagger } from '../components/motion/variants';
import { categoryHue } from '../features/explore/featureVisuals';
import { NEWS_EDITIONS } from '../data/news';
import { editionForDay, recentDays } from '../data/news/rotation';
import type { NewsEdition, NewsLevel, NewsLevelId } from '../data/news/types';
import type { WordId } from '../data/questionWords/types';
import { questionWord } from '../data/questionWords/words';
import { resolveFeatureStatus } from '../config/featureFlags';
import { NewsPlayer } from '../features/news/NewsPlayer';
import { useBroadcast } from '../features/news/useBroadcast';
import { StoryTranscript } from '../features/news/StoryTranscript';
import { WeekStrip } from '../features/news/WeekStrip';
import {
  defaultNewsLevel, earnsXp, isNewsLevel, newsContentId, newsDays, newsStreak,
} from '../features/news/newsProgress';
import { IntoxOuInfo } from '../features/news/show/segments/IntoxOuInfo';
import { SegmentTurns, type TurnAnswer } from '../features/news/show/segments/SegmentTurns';
import { NewsCoachFeedback } from '../features/news/show/NewsCoachFeedback';
import { StoryLinks } from '../features/news/show/StoryLinks';
import { YourAnswers } from '../features/news/show/YourAnswers';
import { segmentTurns } from '../features/news/show/segmentPrompts';
import { segmentFeedback, segmentQuestion } from '../features/news/show/segmentFeedback';
import { wordsUsed } from '../features/news/show/wordsUsed';
import { journalistOutcome } from '../features/news/show/journalistReply';
import {
  SEGMENT_INFO, SEGMENT_ORDER, featuredSegment, showScore, type SegmentId,
} from '../features/news/show/showPlan';
import { PlayIconButton } from '../components/ui/PlayButton';
import { TTS } from '../services/tts/ttsService';
import type { FeedbackV2, Session } from '../types';
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '../services/persistence/storage';
import { awardXP, checkAchievements, getProgressionState } from '../services/progression/progressionService';
import { getSessionHistory, recordSession as persistSession } from '../services/analytics/analyticsService';
import { buildAchievementContext } from '../services/coach/achievementContextBuilder';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { track } from '../services/telemetry/telemetryService';
import { localDay } from '../lib/localDay';

type Phase = 'listen' | 'intox' | 'segment' | 'processing' | 'review';

/** How far back the archive reaches (daily-news §6). */
export const ARCHIVE_DAYS = 14;

const LEVEL_OPTIONS: { id: NewsLevelId; label: string; note: string }[] = [
  { id: 'a2', label: 'Easier', note: 'A2' },
  { id: 'b1', label: 'Standard', note: 'B1' },
  { id: 'b2', label: 'Harder', note: 'B2' },
];

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const cardClass = 'rounded-card border border-hairline bg-surface p-5 md:p-8';

/** One line saying what today's segment is, for the listen card (daily-news §7). */
function SegmentPreview({ segment, lvl }: { segment: SegmentId; lvl: NewsLevel }) {
  if (segment === 'interview') {
    return <><span lang="fr" className="text-ink">{lvl.interview.role.fr}</span> {lvl.interview.role.en} Henri interviews you.</>;
  }
  if (segment === 'debate') {
    return <>Argue both sides of <span lang="fr" className="text-ink">« {lvl.debate.motion.fr} »</span></>;
  }
  if (segment === 'journalist') {
    return <>You’re the reporter. Ask Henri three questions in French to get the facts for your article.</>;
  }
  return <>Say what happens next in the story, then what you would do in their place.</>;
}

/** How to play the segment, above the turns. */
function SegmentHowTo({ segment, lvl }: { segment: SegmentId; lvl: NewsLevel }) {
  if (segment === 'interview') {
    return <><span lang="fr" className="text-ink">{lvl.interview.role.fr}</span> Answer in role, and invent details if you like.</>;
  }
  if (segment === 'debate') return <>First argue for, then against. Give a reason each time: parce que, car, à mon avis…</>;
  if (segment === 'journalist') {
    return <>Each goal needs a different question word: qui, où, quand, combien, comment, pourquoi, quel, qu’est-ce que. Henri answers when your question asks for the right thing.</>;
  }
  return <>Use the future first (il va…, il y aura…), then the conditional (je ferais, j’aimerais…).</>;
}

/** Listen → Intox ou info → the segment → Review, as a quiet four-step track. */
function StepTrack({ phase, segmentLabel }: { phase: Phase; segmentLabel: string }) {
  const steps = ['Listen', 'Intox ou info', segmentLabel, 'Review'];
  const at = phase === 'listen' ? 0 : phase === 'intox' ? 1 : phase === 'review' ? 3 : 2;
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < at;
        const current = i === at;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-caption font-semibold font-numeral
                transition-colors duration-state ease-smooth
                ${done ? 'bg-progress-soft text-progress-text' : current ? 'bg-action text-action-ink' : 'bg-track text-ink-subtle'}`}
            >
              {done ? <Check size={12} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`hidden whitespace-nowrap text-label md:inline ${current ? 'text-ink' : done ? 'text-ink-muted' : 'text-ink-subtle'}`}>{label}</span>
            {current && <span className="whitespace-nowrap text-label text-ink md:hidden">{label}</span>}
            {i < steps.length - 1 && <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-hairline" />}
          </li>
        );
      })}
    </ol>
  );
}

interface SegmentResult {
  segment: SegmentId;
  answers: TurnAnswer[];
  feedback: FeedbackV2 | null;
  /** True when there was something to mark but no feedback came back. */
  feedbackFailed: boolean;
  /** XP actually awarded; 0 for practice or a replay. */
  xp: number;
  featured: boolean;
  /** The featured segment on an edition-day already finished: kept, no XP. */
  replay: boolean;
  /** Le journaliste: the question words mixed up (the goal's word and the one used). */
  mixups: WordId[];
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

  const edition: NewsEdition = useMemo(() => editionForDay(day, NEWS_EDITIONS), [day]);
  const [level, setLevelState] = useState<NewsLevelId>(() => {
    const stored = storageGet<unknown>(STORAGE_KEYS.newsLevel, null);
    return isNewsLevel(stored) ? stored : defaultNewsLevel(state.markingLevel);
  });
  const lvl = edition.levels[level];
  const sentenceTexts = useMemo(() => lvl.sentences.map(s => s.fr), [lvl]);
  const featured = featuredSegment(day);

  const [phase, setPhase] = useState<Phase>('listen');
  const [active, setActive] = useState<SegmentId>(featured);
  const [stopSignal, setStopSignal] = useState(0);
  const broadcast = useBroadcast(sentenceTexts, stopSignal);
  const [showTranscript, setShowTranscript] = useState(false);
  const [intoxRight, setIntoxRight] = useState<boolean | null>(null);
  const [result, setResult] = useState<SegmentResult | null>(null);
  const [history, setHistory] = useState(() => getSessionHistory());
  const finishing = useRef(false);
  const mixups = useRef<WordId[]>([]);

  useEffect(() => {
    // The AI-written edition's cache (retired 2026-11-11).
    storageRemove(STORAGE_KEYS.legacyNewsCache);
  }, []);

  const week = useMemo(() => newsDays(history, today, NEWS_EDITIONS, 7), [history, today]);
  const streak = useMemo(() => newsStreak(history, today), [history, today]);
  const archive = useMemo(
    () => newsDays(history, today, NEWS_EDITIONS, ARCHIVE_DAYS + 1).filter(d => d.day !== today && d.day !== day).reverse(),
    [history, today, day],
  );
  const contentId = newsContentId(edition.id, day);
  const doneBefore = !earnsXp(history, contentId);
  const isArchive = day !== today;
  const turns = useMemo(() => segmentTurns(lvl, active), [lvl, active]);
  const otherSegments = (done: SegmentId) => [featured, ...SEGMENT_ORDER.filter(s => s !== featured)].filter(s => s !== done);
  const detectiveLive = resolveFeatureStatus('questionDetective') === 'live';

  // Le journaliste: Henri answers a question that uses the right word, else a nudge (journalistReply.ts).
  const respond = active === 'journalist'
    ? (i: number, text: string) => {
        const target = lvl.journalist.targets[i];
        const outcome = journalistOutcome(target, text);
        if (outcome.mixup) {
          for (const w of [target.word, outcome.mixup]) if (!mixups.current.includes(w)) mixups.current.push(w);
        }
        return outcome.response;
      }
    : undefined;

  const setLevel = (l: NewsLevelId) => {
    setLevelState(l);
    storageSet(STORAGE_KEYS.newsLevel, l);
  };

  const stopAudio = () => setStopSignal(n => n + 1);
  const transcriptUnlocked = broadcast.listened || broadcast.unavailable;

  const goIntox = () => {
    stopAudio();
    setPhase('intox');
  };

  const onIntoxDone = (right: boolean) => {
    setIntoxRight(right);
    setActive(featured);
    mixups.current = [];
    setPhase('segment');
  };

  const finishSegment = async (answers: TurnAnswer[]) => {
    if (finishing.current) return;
    finishing.current = true;
    stopAudio();
    setPhase('processing');

    const texts = answers.map(a => a.text);
    const answered = texts.filter(t => t.trim()).length;
    const isFeatured = active === featured;
    const question = segmentQuestion(edition, level, active);
    const fb = answered > 0 ? await segmentFeedback(texts, question) : null;
    const full = texts.filter(Boolean).join(' ');

    let xp = 0;
    let replay = false;
    if (isFeatured && answered > 0) {
      const score = showScore(intoxRight ?? false, answered, SEGMENT_INFO[active].turns);
      const first = earnsXp(getSessionHistory(), contentId);
      replay = !first;
      const session: Session = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mode: 'daily_news',
        topicKey: 'news',
        questionText: question.text,
        transcript: full,
        wordCount: wordCount(full),
        score,
        xpEarned: 0,
        durationSec: Math.max(1, Math.round(answers.reduce((n, a) => n + a.seconds, 0))),
        feedback: fb ?? undefined,
        createdAt: new Date().toISOString(),
        contentId,
      };
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
      setHistory(getSessionHistory());
    }

    if (answered > 0) track({ name: 'news_segment_completed', props: { segment: active, level, featured: isFeatured, answered } });
    setResult({ segment: active, answers, feedback: fb, feedbackFailed: answered > 0 && !fb, xp, featured: isFeatured, replay, mixups: [...mixups.current] });
    setPhase('review');
    finishing.current = false;
  };

  const playPractice = (segment: SegmentId) => {
    stopAudio();
    mixups.current = [];
    setActive(segment);
    setResult(null);
    setPhase('segment');
  };

  const restart = (nextLevel?: NewsLevelId) => {
    stopAudio();
    if (nextLevel) setLevel(nextLevel);
    setPhase('listen');
    setShowTranscript(false);
    setIntoxRight(null);
    setActive(featured);
    setResult(null);
  };

  const chipStyle = { '--h': categoryHue('Speak & Listen') } as CSSProperties;
  const nextLevel: NewsLevelId | null = level === 'a2' ? 'b1' : level === 'b1' ? 'b2' : null;
  const activeInfo = SEGMENT_INFO[active];
  const answered = result ? result.answers.filter(a => a.text.trim()).length : 0;
  const story = result ? wordsUsed(lvl.glossary, result.answers.map(a => a.text)) : [];

  return (
    <>
      <TopContextBar
        title="Le Journal du Jour"
        subtitle="Today's story, then your turn on air"
        showBack
        backLabel="Back to Explore"
        onBack={() => navigate('/explore')}
      />

      <PageShell maxWidth="md" gap={16}>
        <motion.section variants={item} className={cardClass} aria-labelledby="news-headline">
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
                <p className="mt-2 inline-flex items-center gap-1.5 text-caption text-progress-text">
                  <Check size={12} aria-hidden="true" /> You’ve done today’s segment. Replays are practice (no XP).
                </p>
              )}
            </div>
          </div>
          {phase === 'listen' && (
            <div className="mt-6">
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
          <div className="mt-6">
            <StepTrack phase={phase} segmentLabel={activeInfo.title} />
          </div>
          {!isArchive && (
            <div className="mt-6 border-t border-hairline pt-5">
              <WeekStrip days={week} today={today} streak={streak} />
            </div>
          )}
        </motion.section>

        {phase === 'listen' && (
          <motion.div key="listen" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className={cardClass} aria-labelledby="news-listen">
              <h2 id="news-listen" className="text-section text-ink">Les titres: listen to the story</h2>
              <p className="mt-1 text-body-s text-ink-muted">
                Play it as often as you like. Listen closely: next, Henri reads it again with one detail changed.
              </p>

              <div className="mt-5">
                <p className="text-eyebrow uppercase text-ink-subtle">Words to know</p>
                <WordChips glossary={lvl.glossary} />
              </div>

              <div className="mt-6">
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
                      {transcriptUnlocked ? 'Want to read along? Open the transcript.' : 'Listen once all the way through to unlock the transcript.'}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setShowTranscript(true)} disabled={!transcriptUnlocked} className="shrink-0" data-testid="news-reveal">
                      {transcriptUnlocked ? <Eye size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />} Show transcript
                    </Button>
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6" aria-labelledby="news-today-segment">
              <p className="text-eyebrow uppercase text-ink-subtle">Today’s segment</p>
              <h2 id="news-today-segment" className="mt-1 text-section text-ink">{activeInfo.title}</h2>
              <p className="mt-1 text-body-s text-ink-muted">
                <SegmentPreview segment={active} lvl={lvl} />
              </p>
              <div className="mt-5 flex justify-end">
                <Button size="lg" onClick={goIntox} className="w-full sm:w-auto sm:min-w-48" data-testid="news-start">
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

        {phase === 'intox' && (
          <motion.section key="intox" variants={item} initial="hidden" animate="show" className={cardClass} aria-labelledby="news-intox">
            <p className="text-eyebrow uppercase text-ink-subtle">Intox ou info ?</p>
            <h2 id="news-intox" className="mt-1 text-section text-ink">One detail has changed</h2>
            <p className="mt-1 text-body-s text-ink-muted">Henri reads the story again, but something isn’t true. Can you spot it?</p>
            <div className="mt-5">
              <IntoxOuInfo sentences={lvl.sentences} fake={lvl.fake} onDone={onIntoxDone} />
            </div>
          </motion.section>
        )}

        {phase === 'segment' && (
          <motion.div key={`segment-${active}`} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6" aria-labelledby="news-segment">
              <p className="inline-flex items-center gap-1.5 text-eyebrow uppercase text-ink-subtle">
                <Mic size={12} aria-hidden="true" /> {active === featured ? 'You’re on air' : 'Practice segment · no XP'}
              </p>
              <h2 id="news-segment" className="mt-1 text-section text-ink">{activeInfo.title}</h2>
              <p className="mt-1 text-body-s text-ink-muted">
                <SegmentHowTo segment={active} lvl={lvl} />
              </p>
            </motion.section>
            <motion.div variants={item}>
              <SegmentTurns key={`${active}-${level}`} prompts={turns} respond={respond} onDone={answers => void finishSegment(answers)} />
            </motion.div>
          </motion.div>
        )}

        {phase === 'processing' && (
          <section className="rounded-card border border-hairline bg-surface p-8 text-center" aria-busy="true" aria-live="polite" data-testid="news-processing">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-pill border-4 border-action border-t-transparent" aria-hidden="true" />
            <p className="mt-4 text-label text-ink">The editors are listening back…</p>
          </section>
        )}

        {phase === 'review' && result && (
          <motion.div key="review" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className={cardClass} aria-labelledby="news-result">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-eyebrow uppercase text-ink-subtle">{SEGMENT_INFO[result.segment].title}</p>
                  <h2 id="news-result" className="mt-1 text-section text-ink">
                    {answered > 0 ? 'That’s a wrap!' : 'Nothing recorded this time'}
                  </h2>
                  {intoxRight !== null && (
                    <p className="mt-1 text-body-s text-ink-muted">
                      Intox ou info: {intoxRight ? 'you spotted the fake.' : 'the fake got past you this time.'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.xp > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-reward-soft px-3 py-1 text-label text-reward-text" data-testid="news-xp">
                      <Zap size={14} aria-hidden="true" /> <span className="font-numeral">+{result.xp}</span> XP
                    </span>
                  )}
                  {(result.replay || !result.featured) && answered > 0 && (
                    <span className="inline-flex items-center rounded-pill bg-track px-3 py-1 text-label text-ink-muted" data-testid="news-practice-run">
                      Practice · no XP
                    </span>
                  )}
                </div>
              </div>

              {answered > 0 && (
                <div className="mt-6">
                  {result.feedback && <NewsCoachFeedback feedback={result.feedback} transcript={result.answers.map(a => a.text).filter(Boolean).join(' ')} />}
                  {result.feedbackFailed && (
                    <p role="status" className="rounded-control bg-reward-soft px-4 py-3 text-body-s text-reward-text" data-testid="news-feedback-unavailable">
                      Feedback on your French isn’t available right now (you may be offline or signed out). Your answers and the model answers are below.
                    </p>
                  )}
                </div>
              )}
            </motion.section>

            {answered > 0 && (
              <motion.section variants={item} className={cardClass} aria-labelledby="news-words">
                <h2 id="news-words" className="text-label text-ink">Story words you used</h2>
                <p className="mt-1 text-body-s text-ink-muted">Borrowing the story’s words is how news builds your exam vocabulary.</p>
                <ul className="mt-3 flex flex-wrap gap-2" data-testid="news-words-used">
                  {story.map(w => (
                    <li
                      key={w.fr}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-pill px-3 text-label
                        ${w.used ? 'bg-progress-soft text-progress-text' : 'border border-hairline-strong text-ink-muted'}`}
                    >
                      {w.used && <Check size={12} aria-hidden="true" />}
                      <span lang="fr">{w.fr}</span>
                      <span className="text-ink-subtle">· {w.en}</span>
                      <span className="sr-only">{w.used ? '(used)' : '(not used)'}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            <motion.section variants={item} className={cardClass} aria-labelledby="news-answers">
              <h2 id="news-answers" className="text-label text-ink">Your answers</h2>
              <div className="mt-4">
                <YourAnswers turns={turns} answers={result.answers} />
              </div>
            </motion.section>

            {result.segment === 'predict' && (
              <motion.section variants={item} className={cardClass} aria-labelledby="news-henri-guess" data-testid="news-henri-guess">
                <h2 id="news-henri-guess" className="text-label text-ink">Et Henri, qu’est-ce qu’il en pense ?</h2>
                <p className="mt-1 text-body-s text-ink-muted">Henri’s guess, not the news: nobody knows what happens next yet.</p>
                <div className="mt-3 flex items-start gap-2 rounded-control bg-surface-recessed p-3">
                  <PlayIconButton play={() => TTS.speak(lvl.predict.henri.fr, { recorded: true, rate: 0.9 })} label="Hear Henri's guess" size={16} className="mt-0.5" />
                  <div className="min-w-0">
                    <p lang="fr" className="text-body-s text-ink">{lvl.predict.henri.fr}</p>
                    <p className="mt-0.5 text-caption text-ink-muted">{lvl.predict.henri.en}</p>
                  </div>
                </div>
              </motion.section>
            )}

            {result.segment === 'journalist' && result.mixups.length > 0 && detectiveLive && (
              <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6" data-testid="news-detective-link">
                <Link
                  to={`/question-detective?words=${result.mixups.join(',')}`}
                  className="flex min-h-12 items-center gap-3 rounded-control border border-hairline px-4 py-2 hover:bg-track"
                >
                  <Search size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label text-ink">Practise these question words</span>
                    <span lang="fr" className="block text-caption text-ink-muted">
                      {result.mixups.map(w => questionWord(w)?.lemma ?? w).join(' · ')} in Question Detective
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                </Link>
              </motion.section>
            )}

            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6">
              <StoryLinks examArea={edition.examArea} learnTopic={edition.learnTopic} />
            </motion.section>

            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6" aria-labelledby="news-more">
                <h2 id="news-more" className="text-label text-ink">More from this story</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {otherSegments(result.segment).map(s => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => playPractice(s)}
                        data-testid={`news-practice-${s}`}
                        className="flex min-h-12 w-full items-center gap-3 rounded-control border border-hairline px-4 py-2 text-left hover:bg-track"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-label text-ink">{SEGMENT_INFO[s].title}</span>
                          <span className="block text-caption text-ink-muted">
                            {SEGMENT_INFO[s].skill}{s === featured ? '' : ' · practice, no XP'}
                          </span>
                        </span>
                        <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.section>

            <motion.div variants={item} className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button variant="secondary" size="lg" onClick={() => restart()} data-testid="news-retry">
                <RotateCcw size={16} aria-hidden="true" /> Start the show again
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
