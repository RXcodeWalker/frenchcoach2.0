import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Mic,
  Info,
  CheckCircle2,
  Radio,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { useRecording } from '../features/recording/useRecording';
import { Waveform } from '../features/recording/Waveform';
import { RecordingPanel } from './learn/RecordingPanel';
import { FeedbackPanel } from './learn/FeedbackPanel';
import { getAIFeedback, getDailyNews } from '../services/api/apiClient';
import { MOCK_NEWS, NewsSnippet } from '../data/mocks/mockNews';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import type { FeedbackV2, Question, Session } from '../types';
import { STORAGE_KEYS } from '../services/persistence/storage';
import { awardXP, checkAchievements, getProgressionState } from '../services/progression/progressionService';
import { recordSession as persistSession } from '../services/analytics/analyticsService';
import { buildAchievementContext } from '../services/coach/achievementContextBuilder';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';

type Phase = 'listening' | 'recording' | 'feedback';

const CACHE_KEY = STORAGE_KEYS.newsCache;

export function DailyNewsFlash() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const recording = useRecording();
  
  const [phase, setPhase] = useState<Phase>('listening');
  const [currentNews, setCurrentNews] = useState<NewsSnippet | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackV2 | null>(null);
  
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      // Fallback to first mock snippet if API fails
      const fallback = MOCK_NEWS[Math.floor(Math.random() * MOCK_NEWS.length)];
      setCurrentNews(fallback);
      setIsLive(false);
      setError("News server unavailable. Loading archival broadcast.");
    } finally {
      setIsLoadingNews(false);
    }
  };

  const togglePlay = () => {
    if (!currentNews) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(currentNews.transcript);
      utterance.lang = 'fr-FR';
      utterance.onend = () => setIsPlaying(false);
      audioRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const handleStartRecording = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setPhase('recording');
    recording.start();
  };

  const handleStopRecording = async () => {
    if (!currentNews) return;
    setIsProcessing(true);
    const userTranscript = await recording.stop();
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
      // Build a specialized News Evaluator
      const evaluateNewsReport = (transcript: string, news: NewsSnippet) => {
        const lowerTranscript = transcript.toLowerCase();
        const foundKeywords = news.keywords.filter(kw => lowerTranscript.includes(kw.toLowerCase()));
        const keywordScore = (foundKeywords.length / news.keywords.length) * 10;
        
        // Length score (target ~25-40 words for a good summary)
        const lengthScore = wordCount > 40 ? 10 : wordCount > 20 ? 8 : wordCount > 10 ? 5 : 2;
        
        // Overall dynamic score (average of keyword relevance and detail length)
        const overall = Math.min(10, (keywordScore * 0.6) + (lengthScore * 0.4));
        
        return {
          overall: Math.round(overall * 10) / 10,
          foundKeywords,
          keywordScore
        };
      };

      const newsStats = evaluateNewsReport(userTranscript, currentNews);
      const fb = await getAIFeedback(userTranscript, question, undefined, recording.audioBlob || undefined);

      // newsStats.overall (keyword coverage + length) is the real relevance
      // score for this mode and drives Session.score/XP independently below —
      // but it says nothing about language/fluency, so the AI feedback's own
      // scores and unscored flag are left untouched here. Overwriting them
      // previously left language/fluency at their offline placeholder 0 while
      // looking graded (A2).

      // Add custom news feedback to the style section or vocabulary
      if (newsStats.foundKeywords.length < currentNews.keywords.length) {
        const missing = currentNews.keywords.filter(kw => !newsStats.foundKeywords.includes(kw));
        fb.style.push({
          label: 'Coverage',
          suggestion: `Try to include more key facts like: ${missing.slice(0, 2).join(', ')}.`
        });
      }

      // Dynamic XP based on our calculated score
      let xpEarned = Math.round(newsStats.overall * 2.5);
      
      // Strictness: Penalty for extremely short or irrelevant responses
      if (wordCount < 5 || newsStats.overall < 3) {
        xpEarned = Math.min(xpEarned, 5);
      }

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
      dispatchAddXP(dispatch, 5, 'daily_news');
      setPhase('feedback');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevealTranscript = () => {
    setShowTranscript(true);
    dispatchAddXP(dispatch, -5, 'daily_news');
  };

  const handleRetry = () => {
    setPhase('listening');
    setFeedback(null);
    setShowTranscript(false);
  };

  if (isLoadingNews) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopContextBar title="Le Journal du Jour" subtitle="Connecting to News Desk..." onBack={() => navigate('/explore')} />
        <PageShell>
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent"
            />
            <h2 className="text-xl font-black text-white italic uppercase tracking-widest animate-pulse">Gathering Stories...</h2>
            <p className="text-ink-muted text-sm">Our AI reporters are drafting today's broadcast.</p>
          </div>
        </PageShell>
      </div>
    );
  }

  if (!currentNews) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <TopContextBar 
        title="Le Journal du Jour" 
        subtitle={currentNews.headline}
        onBack={() => navigate('/explore')}
      />

      <PageShell>
        <div className="max-w-2xl mx-auto space-y-8 pb-24">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
              isLive 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse' 
                : 'bg-slate-500/10 border-white/10 text-ink-muted'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-rose-500' : 'bg-slate-500'}`} />
              {isLive ? 'Live Satellite Feed' : 'Archival Recording'}
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-bold">
                <AlertCircle size={12} /> Offline Mode
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {phase === 'listening' && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="surface-raised p-8 rounded-3xl text-center space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5">
                    <Radio size={120} className="text-violet-400" />
                  </div>

                  <div className="w-20 h-20 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto border border-violet-500/20 shadow-lg">
                    <Radio size={40} className="text-violet-400" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Sparkles size={14} className="text-violet-400" />
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Active Broadcast</span>
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Phase 1: Listening</h2>
                    <p className="text-ink-muted text-sm">Listen to the news snippet and prepare your verbal report.</p>
                  </div>

                  <div className="py-4">
                    <button
                      onClick={togglePlay}
                      className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 group ${
                        isPlaying 
                          ? 'bg-rose-500 shadow-lg shadow-rose-500/40' 
                          : 'bg-violet-600 shadow-lg shadow-violet-600/40 hover:scale-105'
                      }`}
                    >
                      {isPlaying ? (
                        <Pause size={32} className="text-white fill-white" />
                      ) : (
                        <Play size={32} className="text-white fill-white ml-2 group-hover:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>

                  {isPlaying && (
                    <div className="w-full h-12">
                      <Waveform data={Array(40).fill(0).map(() => Math.random() * 30 + 5)} isRecording={true} />
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={handleRevealTranscript}
                      disabled={showTranscript}
                      className={`flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        showTranscript 
                          ? 'border-white/10 text-ink-muted bg-white/5' 
                          : 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10 active:scale-95'
                      }`}
                    >
                      {showTranscript ? <Eye size={14} /> : <EyeOff size={14} />}
                      {showTranscript ? 'Transcript Revealed' : 'Reveal Transcript (-5 XP)'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showTranscript && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-navy-300/50 rounded-2xl p-6 text-left border border-white/5"
                      >
                        <p className="text-sm text-ink-muted leading-relaxed italic">"{currentNews.transcript}"</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleStartRecording}
                  className="w-full py-5 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase italic tracking-wider flex items-center justify-center gap-3 shadow-xl active:scale-95"
                >
                  <Mic size={22} /> I'm Ready to Report
                </button>
              </motion.div>
            )}

            {phase === 'recording' && (
              <motion.div
                key="recording"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="surface-raised p-8 rounded-3xl text-center space-y-6 relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">Phase 2: Reporting</span>
                    <h2 className="text-2xl font-black text-white italic">Summarize the Broadcast</h2>
                    <p className="text-ink-muted text-sm">Explain in French what you just heard. Be concise.</p>
                  </div>

                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5 flex gap-4 items-start text-left">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                      <Info size={20} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1.5">Editorial Guidelines</p>
                      <p className="text-xs text-ink-muted mb-3 leading-relaxed">Try to include these keywords in your report:</p>
                      <div className="flex flex-wrap gap-2">
                        {currentNews.keywords.map(kw => (
                          <span key={kw} className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded-lg text-ink-muted font-bold uppercase tracking-tight">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative pt-6">
                    <AnimatePresence>
                      {isProcessing && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 z-20 surface rounded-2xl flex flex-col items-center justify-center bg-navy/80 backdrop-blur-sm"
                        >
                          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
                          <p className="text-violet-400 font-black uppercase tracking-widest italic text-lg">Analyzing Report...</p>
                          <p className="text-ink-muted text-xs mt-2 italic">Our editors are reviewing your summary.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <RecordingPanel 
                      isActive={true}
                      recording={recording}
                      onStop={handleStopRecording}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setPhase('listening')}
                  className="w-full py-4 bg-white/5 border border-white/10 text-ink-muted font-bold rounded-2xl hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest"
                >
                  Return to Broadcast
                </button>
              </motion.div>
            )}

            {phase === 'feedback' && feedback && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="surface-raised rounded-3xl overflow-hidden border border-violet-500/20">
                  <div className="bg-violet-500/10 p-4 border-b border-violet-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio size={16} className="text-violet-400" />
                      <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Edition Review</span>
                    </div>
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">{currentNews.date}</span>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Broadcast Review Section */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-ink-muted uppercase tracking-widest">Original Broadcast (French)</p>
                        <p className="text-sm text-white leading-relaxed font-medium">{currentNews.transcript}</p>
                      </div>
                      <div className="space-y-1 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-violet-400/70 uppercase tracking-widest">English Translation</p>
                        <p className="text-xs text-ink-muted leading-relaxed italic">{currentNews.translation}</p>
                      </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <FeedbackPanel 
                      feedback={feedback}
                      onComplete={() => navigate('/explore')}
                      onRetry={handleRetry}
                    />
                  </div>
                </div>

                
                <div className="flex gap-4">
                  <button
                    onClick={handleRetry}
                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <RotateCcw size={18} /> Retry
                  </button>
                  <button
                    onClick={() => navigate('/explore')}
                    className="flex-[2] py-4 bg-violet-600 text-white font-black rounded-2xl hover:bg-violet-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 active:scale-95"
                  >
                    Submit Report <CheckCircle2 size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageShell>
    </div>
  );
}
