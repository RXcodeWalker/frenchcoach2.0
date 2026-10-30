import { useState, useEffect, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Eye, Mic, Newspaper, RotateCcw, Zap } from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { SpeakingConsentGate } from '../components/SpeakingConsentGate';
import { useRecording } from '../features/recording/useRecording';
import { RecordingPanel, type ProcessingStep } from './learn/RecordingPanel';
import { FeedbackPanel } from './learn/FeedbackPanel';
import { getAIFeedback, getDailyNews } from '../services/api/apiClient';
import { MOCK_NEWS, NewsSnippet } from '../data/mocks/mockNews';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { enter, enterReduced, fill, stagger } from '../components/motion/variants';
import { categoryHue } from '../features/explore/featureVisuals';
import { NewsPlayer } from '../features/news/NewsPlayer';
import { evaluateNewsReport, keywordsHeard, newsReportXp, splitSentences } from '../features/news/newsReport';
import type { FeedbackV2, Question, Session } from '../types';
import { STORAGE_KEYS } from '../services/persistence/storage';
import { awardXP, checkAchievements, getProgressionState } from '../services/progression/progressionService';
import { recordSession as persistSession } from '../services/analytics/analyticsService';
import { buildAchievementContext } from '../services/coach/achievementContextBuilder';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';

type Phase = 'listening' | 'recording' | 'feedback';

const CACHE_KEY = STORAGE_KEYS.newsCache;
const TRANSCRIPT_COST_XP = 5;

const STEPS: Array<{ id: Phase; label: string }> = [
  { id: 'listening', label: 'Listen' },
  { id: 'recording', label: 'Report' },
  { id: 'feedback', label: 'Review' },
];

interface Coverage {
  found: string[];
  missed: string[];
  xp: number;
}

function formatEdition(date: string): string {
  const d = new Date(date);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Listen → Report → Review, as a quiet three-step track. */
function StepTrack({ phase }: { phase: Phase }) {
  const at = STEPS.findIndex(s => s.id === phase);
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
            <span className={`text-label ${current ? 'text-ink' : done ? 'text-ink-muted' : 'text-ink-subtle'}`}>{step.label}</span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px flex-1 bg-hairline" />}
          </li>
        );
      })}
    </ol>
  );
}

export function DailyNewsFlash() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const { state, dispatch } = useApp();
  const { consentStatus } = useAuth();
  const recording = useRecording(consentStatus === 'pending');

  const [phase, setPhase] = useState<Phase>('listening');
  const [currentNews, setCurrentNews] = useState<NewsSnippet | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [processing, setProcessing] = useState<ProcessingStep | null>(null);
  const [feedback, setFeedback] = useState<FeedbackV2 | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [stopSignal, setStopSignal] = useState(0);

  useEffect(() => {
    loadNews();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const loadNews = async () => {
    setIsLoadingNews(true);
    setError(null);
    setIsLive(false);

    const today = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem(CACHE_KEY);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === today) {
          setCurrentNews(parsed);
          setIsLive(true);
          setIsLoadingNews(false);
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached news:", e);
      }
    }

    try {
      const news = await getDailyNews();
      setCurrentNews(news);
      setIsLive(true);
      localStorage.setItem(CACHE_KEY, JSON.stringify(news));
    } catch (err) {
      console.error("Failed to load dynamic news, falling back to mock:", err);
      // Fallback to a mock snippet if the API fails
      const fallback = MOCK_NEWS[Math.floor(Math.random() * MOCK_NEWS.length)];
      setCurrentNews(fallback);
      setIsLive(false);
      setError("Today’s news couldn’t be loaded, so here is an archive story.");
    } finally {
      setIsLoadingNews(false);
    }
  };

  const handleStartRecording = () => {
    setStopSignal(n => n + 1);
    setPhase('recording');
    recording.start();
  };

  const handleStopRecording = async () => {
    if (!currentNews) return;
    setProcessing(0);
    const userTranscript = await recording.stop();
    setProcessing(1);
    const wordCount = userTranscript.split(/\s+/).filter(Boolean).length;

    const question: Question = {
      id: currentNews.id,
      text: `Résumez cette nouvelle : "${currentNews.headline}"`,
      topicKey: 'news',
      hint: "Concentrez-vous sur les faits principaux.",
      difficulty: 2,
      followUps: [],
      modelAnswer: currentNews.summaryPoints.join('. '),
      keyVocab: currentNews.keywords.map(kw => ({ fr: kw, en: '' }))
    };

    try {
      // Keyword coverage + length is the real relevance score for this mode and
      // drives Session.score/XP independently below — but it says nothing about
      // language/fluency, so the AI feedback's own scores and unscored flag are
      // left untouched here. Overwriting them previously left language/fluency
      // at their offline placeholder 0 while looking graded (A2).
      const newsStats = evaluateNewsReport(userTranscript, currentNews);
      const fb = await getAIFeedback(userTranscript, question, undefined, recording.audioBlob || undefined);

      if (newsStats.missedKeywords.length > 0) {
        fb.style.push({
          label: 'Coverage',
          suggestion: `Try to include more key facts like: ${newsStats.missedKeywords.slice(0, 2).join(', ')}.`
        });
      }

      const xpEarned = newsReportXp(newsStats.overall, wordCount);

      setFeedback(fb);

      const session: Session = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mode: 'daily_news',
        topicKey: 'news',
        questionText: question.text,
        transcript: userTranscript,
        wordCount,
        score: newsStats.overall,
        xpEarned,
        durationSec: 30,
        feedback: fb,
        createdAt: new Date().toISOString()
      };

      persistSession(session);
      const xpResult = awardXP(newsStats.overall, state.profile.streak_days, 'daily_news');
      const { level: newLevel } = getProgressionState();
      const newUnlockedAchievementIds = checkAchievements(
        buildAchievementContext({
          finalScore: newsStats.overall,
          streakDays: state.profile.streak_days,
          totalSessionsAfter: state.profile.sessions_count + 1,
          topicsUsed: [],
          beliefSnapshot: null,
          examCompleted: false,
          examType: null,
        }),
      );
      dispatch({ type: 'ADD_SESSION', session: { ...session, xpEarned: xpResult.gain }, xpResult, newUnlockedAchievementIds, newLevelName: newLevel.name });
      observeAttempt({
        sessionId: session.id,
        question,
        feedback: fb,
        transcript: userTranscript,
        finalScore: newsStats.overall,
        mode: 'daily-news',
        topicKey: 'news',
      });
      dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });
      setCoverage({ found: newsStats.foundKeywords, missed: newsStats.missedKeywords, xp: xpResult.gain });
      setPhase('feedback');
    } catch (error) {
      console.error("Failed to get feedback:", error);
      const fallbackFb: FeedbackV2 = {
        scores: { overall: 3, communication: 3, language: 3, fluency: 3 },
        grammar: { critical: [], polish: [] },
        vocabulary: [],
        style: [{ label: 'Offline', suggestion: 'Automatic grading is limited without connection.' }],
        fillers: [],
        wordCount,
        cefrLevel: 'A1'
      };
      setFeedback(fallbackFb);
      const heard = keywordsHeard(userTranscript, currentNews.keywords);
      setCoverage({ found: heard, missed: currentNews.keywords.filter(kw => !heard.includes(kw)), xp: 5 });
      dispatchAddXP(dispatch, 5, 'daily_news');
      setPhase('feedback');
    } finally {
      setProcessing(null);
    }
  };

  const handleRevealTranscript = () => {
    setShowTranscript(true);
    dispatchAddXP(dispatch, -TRANSCRIPT_COST_XP, 'daily_news');
  };

  const handleRetry = () => {
    setStopSignal(n => n + 1);
    setPhase('listening');
    setFeedback(null);
    setCoverage(null);
    setShowTranscript(false);
  };

  const backToListening = () => {
    setStopSignal(n => n + 1);
    setPhase('listening');
  };

  const handleReloadLive = async () => {
    setStopSignal(n => n + 1);
    await loadNews();
  };

  if (isLoadingNews) {
    return (
      <>
        <TopContextBar title="Le Journal du Jour" subtitle="Fetching today’s story" showBack backLabel="Back to Explore" onBack={() => navigate('/explore')} />
        <PageShell maxWidth="md" gap={16}>
          <section
            className="rounded-card border border-hairline bg-surface p-5 md:p-8"
            aria-busy="true"
            aria-live="polite"
            data-testid="news-loading"
          >
            <p className="text-eyebrow uppercase text-ink-subtle">Today’s edition</p>
            <div className="mt-3 h-6 w-2/3 rounded-control bg-track" aria-hidden="true" />
            <div className="mt-6 h-16 rounded-card bg-surface-recessed" aria-hidden="true" />
            <p className="mt-4 text-body-s text-ink-muted">Getting today’s story ready…</p>
          </section>
        </PageShell>
      </>
    );
  }

  if (!currentNews) return null;

  const keywordsInProgress = phase === 'recording' ? keywordsHeard(recording.transcript, currentNews.keywords) : [];
  const transcriptLines = splitSentences(currentNews.transcript);
  const busy = recording.isRecording || processing !== null;
  const chipStyle = { '--h': categoryHue('Speak & Listen') } as CSSProperties;

  return (
    <>
      <TopContextBar
        title="Le Journal du Jour"
        subtitle="Listen, then report back in French"
        showBack
        backLabel="Back to Explore"
        onBack={() => navigate('/explore')}
      />

      <PageShell maxWidth="md" gap={16}>
        <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-headline">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="topic-chip flex h-10 w-10 shrink-0 items-center justify-center"
              style={{ ...chipStyle, borderRadius: 8 }}
            >
              <Newspaper size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-eyebrow uppercase text-ink-subtle">
                {isLive ? 'Today’s edition' : 'Archive edition'} · {formatEdition(currentNews.date)}
              </p>
              <h2 id="news-headline" className="mt-1 text-title text-ink">{currentNews.headline}</h2>
            </div>
          </div>
          <div className="mt-5">
            <StepTrack phase={phase} />
          </div>
          {error && (
            <div role="status" className="mt-5 flex flex-col gap-3 rounded-control bg-reward-soft px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-body-s text-reward-text">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
              <Button variant="secondary" size="sm" onClick={handleReloadLive} className="shrink-0">
                Try again
              </Button>
            </div>
          )}
        </motion.section>

        {phase === 'listening' && (
          <motion.div key="listening" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-listen">
              <h2 id="news-listen" className="text-section text-ink">Listen to the story</h2>
              <p className="mt-1 text-body-s text-ink-muted">
                Play it as often as you need. Note the main facts: who, what, where, when.
              </p>
              <div className="mt-5">
                <NewsPlayer text={currentNews.transcript} stopSignal={stopSignal} />
              </div>

              <div className="mt-6 border-t border-hairline pt-5">
                {showTranscript ? (
                  <div data-testid="news-transcript">
                    <p className="text-eyebrow uppercase text-ink-subtle">Transcript</p>
                    <div className="mt-2 flex flex-col gap-2 rounded-control bg-surface-recessed p-4">
                      {transcriptLines.map((line, i) => (
                        <p key={i} lang="fr" className="text-body-s text-ink">{line}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-body-s text-ink-muted">Stuck? You can read it, but it costs {TRANSCRIPT_COST_XP} XP.</p>
                    <Button variant="secondary" size="sm" onClick={handleRevealTranscript} className="shrink-0" data-testid="news-reveal">
                      <Eye size={16} aria-hidden="true" /> Show transcript
                    </Button>
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-label text-ink">Ready to report?</p>
                  <p className="text-body-s text-ink-muted">Retell the story in French in two or three sentences.</p>
                </div>
                <SpeakingConsentGate>
                  <Button size="lg" onClick={handleStartRecording} className="sm:min-w-48" data-testid="news-start">
                    <Mic size={18} aria-hidden="true" /> Start my report
                  </Button>
                </SpeakingConsentGate>
              </div>
            </motion.section>
          </motion.div>
        )}

        {phase === 'recording' && (
          <motion.div key="recording" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-report">
              <h2 id="news-report" className="text-section text-ink">Retell the story in French</h2>
              <p className="mt-1 text-body-s text-ink-muted">Aim for about 40 words. Work in these key words if you can.</p>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Key words">
                {currentNews.keywords.map(kw => {
                  const used = keywordsInProgress.includes(kw);
                  return (
                    <li
                      key={kw}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-pill border px-3 text-label
                        transition-colors duration-state ease-smooth
                        ${used ? 'border-transparent bg-progress-soft text-progress-text' : 'border-hairline-strong text-ink-muted'}`}
                    >
                      {used && <Check size={14} aria-hidden="true" />}
                      {kw}
                      {used && <span className="sr-only"> (used)</span>}
                    </li>
                  );
                })}
              </ul>
            </motion.section>

            <motion.div variants={item}>
              <RecordingPanel isActive={true} recording={recording} onStop={handleStopRecording} processing={processing} />
            </motion.div>

            <motion.div variants={item} className="flex justify-center">
              <Button variant="quiet" size="md" onClick={backToListening} disabled={busy}>
                Listen to the story again
              </Button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'feedback' && feedback && (
          <motion.div key="feedback" variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            {coverage && (
              <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-cover">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-eyebrow uppercase text-ink-subtle">Your report</p>
                    <h2 id="news-cover" className="mt-1 text-section text-ink">
                      You used <span className="font-numeral">{coverage.found.length}</span> of{' '}
                      <span className="font-numeral">{currentNews.keywords.length}</span> key words
                    </h2>
                  </div>
                  {coverage.xp > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-reward-soft px-3 py-1 text-label text-reward-text">
                      <Zap size={14} aria-hidden="true" />
                      <span className="font-numeral">+{coverage.xp}</span> XP
                    </span>
                  )}
                </div>
                <div
                  role="progressbar"
                  aria-label="Key words used"
                  aria-valuemin={0}
                  aria-valuemax={currentNews.keywords.length}
                  aria-valuenow={coverage.found.length}
                  className="mt-4 h-1.5 overflow-hidden rounded-pill bg-track"
                >
                  <motion.span
                    className="block h-full rounded-pill bg-progress"
                    initial={{ width: reduced ? `${(coverage.found.length / Math.max(1, currentNews.keywords.length)) * 100}%` : 0 }}
                    animate={{ width: `${(coverage.found.length / Math.max(1, currentNews.keywords.length)) * 100}%` }}
                    transition={reduced ? { duration: 0 } : fill()}
                  />
                </div>
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Key words">
                  {coverage.found.map(kw => (
                    <li key={kw} className="inline-flex min-h-8 items-center gap-1.5 rounded-pill bg-progress-soft px-3 text-label text-progress-text">
                      <Check size={14} aria-hidden="true" /> {kw}
                      <span className="sr-only"> (used)</span>
                    </li>
                  ))}
                  {coverage.missed.map(kw => (
                    <li key={kw} className="inline-flex min-h-8 items-center rounded-pill border border-hairline-strong px-3 text-label text-ink-muted">
                      {kw}
                      <span className="sr-only"> (missed)</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            <motion.section variants={item} className="rounded-card border border-hairline bg-surface p-5 md:p-8" aria-labelledby="news-review">
              <h2 id="news-review" className="text-section text-ink">The story</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-control bg-surface-recessed p-4">
                  <p className="text-eyebrow uppercase text-ink-subtle">French</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {transcriptLines.map((line, i) => (
                      <p key={i} lang="fr" className="text-body-s text-ink">{line}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-control bg-surface-recessed p-4">
                  <p className="text-eyebrow uppercase text-ink-subtle">English</p>
                  <p className="mt-2 text-body-s text-ink-muted">{currentNews.translation}</p>
                </div>
              </div>
              {currentNews.summaryPoints.length > 0 && (
                <div className="mt-5">
                  <p className="text-eyebrow uppercase text-ink-subtle">Key facts</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {currentNews.summaryPoints.map(point => (
                      <li key={point} className="flex items-start gap-2 text-body-s text-ink-muted">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-action" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.section>

            <motion.div variants={item}>
              <FeedbackPanel feedback={feedback} onComplete={() => navigate('/explore')} onRetry={handleRetry} hideActions />
            </motion.div>

            <motion.div variants={item} className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="lg" onClick={handleRetry} data-testid="news-retry">
                <RotateCcw size={16} aria-hidden="true" /> Try again
              </Button>
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
