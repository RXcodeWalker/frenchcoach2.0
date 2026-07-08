import { useEffect } from 'react';
import { Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Zap } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Auth } from './screens/Auth';
import { XPAnimations } from './components/XPAnimation';
import { GemAnimations } from './components/GemAnimation';
import { SideRail } from './components/Navigation';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { ExamMode } from './screens/ExamMode';
import { Explore } from './screens/Explore';
import { Progress } from './screens/Progress';
import { Profile } from './screens/Profile';
import { Shop } from './screens/Shop';
import { About } from './screens/About';
import { StudyGroups } from './screens/StudyGroups';
import { Rankings } from './screens/Rankings';
import { WeaknessAnalysis } from './screens/WeaknessAnalysis';
import { SentenceRebuilder } from './screens/SentenceRebuilder';
import { Onboarding } from './screens/Onboarding';
import { getCoachProfile } from './services/coach/coachProfileService';

import { RapidFire } from './screens/RapidFire';
import { SpeedSpeaking } from './screens/SpeedSpeaking';
import { FriendChallenges } from './screens/FriendChallenges';
import { FrenchRoadmap } from './screens/FrenchRoadmap';
import { FluencyHeatmap } from './screens/FluencyHeatmap';
import { StoryMode } from './screens/StoryMode';
import { ScenarioArchitect } from './screens/ScenarioArchitect';
import { ScenarioArchitectSession } from './screens/ScenarioArchitectSession';
import { WordDrop } from './screens/WordDrop';
import { MasteryJourney } from './screens/MasteryJourney';
import { BossBattle } from './screens/BossBattle';
import { EmojiMaster } from './screens/EmojiMaster';
import { MysteryBox } from './screens/MysteryBox';
import { SurvivalMode } from './screens/SurvivalMode';
import { AccentAnalyzer } from './screens/AccentAnalyzer';
import { ListeningMode } from './screens/ListeningMode';
import { PronunciationLab } from './screens/PronunciationLab';
import { SpeakingArena } from './screens/SpeakingArena';
import { Challenges } from './screens/Challenges';
import { DailyNewsFlash } from './screens/DailyNewsFlash';
import { CoachBeliefDebug } from './screens/CoachBeliefDebug';
import { AdminRoute } from './components/auth/AdminRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './screens/admin/AdminDashboard';
import { QuestionList } from './screens/admin/questions/QuestionList';
import { QuestionForm } from './screens/admin/questions/QuestionForm';
import { ScenarioList } from './screens/admin/scenarios/ScenarioList';
import { ScenarioForm } from './screens/admin/scenarios/ScenarioForm';
import { VersionHistory } from './screens/admin/VersionHistory';
import { LevelUpCelebration, AchievementUnlocked } from './components/CelebrationModals';
import { MigrationOverlay } from './components/MigrationOverlay';
import { ComingSoonGate } from './components/ComingSoonGate';
import { FEATURE_FLAGS } from './config/featureFlags';
import { supabaseConfigured } from './lib/supabase';

const pageVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 100, damping: 20, mass: 0.5 },
  },
  exit: { opacity: 0, scale: 1.02, transition: { duration: 0.2 } },
};

function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 bg-gradient-to-br from-slate-100 via-blue-50/30 to-violet-50/20 animate-aurora-shift" />
      <div className="absolute -top-40 -left-40 w-96 h-96 dark:bg-blue-600/8 bg-violet-400/6 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-32 w-80 h-80 dark:bg-cyan-500/5 bg-blue-300/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/3 w-72 h-72 dark:bg-blue-800/6 bg-indigo-300/6 rounded-full blur-3xl animate-blob animation-delay-4000" />
      <div className="absolute top-1/4 left-1/4 w-80 h-80 dark:bg-indigo-500/3 bg-purple-200/8 rounded-full blur-3xl animate-blob animation-delay-6000" />
    </div>
  );
}

function GlobalCelebrations() {
  const { state, dispatch } = useApp();
  
  return (
    <AnimatePresence>
      {state.newLevelReached && (
        <LevelUpCelebration 
          newLevel={state.newLevelReached} 
          onDismiss={() => dispatch({ type: 'DISMISS_CELEBRATIONS' })} 
        />
      )}
      {state.lastUnlockedAchievement && (
        <AchievementUnlocked 
          name={state.lastUnlockedAchievement.name}
          icon={state.lastUnlockedAchievement.icon}
          description={state.lastUnlockedAchievement.description}
          xpReward={250}
          onDismiss={() => dispatch({ type: 'DISMISS_CELEBRATIONS' })}
        />
      )}
    </AnimatePresence>
  );
}

function XPToast() {
  const { state, dispatch } = useApp();
  useEffect(() => {
    if (!state.showXPModal) return;
    const id = setTimeout(() => dispatch({ type: 'DISMISS_XP_MODAL' }), 2500);
    return () => clearTimeout(id);
  }, [state.showXPModal]);
  return (
    <AnimatePresence>
      {state.showXPModal && (
        <motion.div
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100]"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <div className="flex items-center gap-3 glass-elevated border-emerald-500/20 rounded-xl px-4 py-2.5 shadow-2xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Zap size={14} className="text-emerald-400 fill-emerald-400/20" />
            </div>
            <div>
              <p className="font-black text-emerald-400 text-xs">+{state.lastXPGained} XP</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">You're crushing it!</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MainLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen dark:bg-navy bg-slate-100 dark:text-white text-slate-900 overflow-hidden">
      <Background />
      <SideRail />
      <main className="relative z-10 md:ml-[64px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <XPAnimations />
      <GemAnimations />
      <XPToast />
      <GlobalCelebrations />
    </div>
  );
}

function ExamLayout() {
  return (
    <div className="min-h-screen dark:bg-navy bg-slate-100 dark:text-white text-slate-900 overflow-hidden">
      <Background />
      <main className="relative z-10">
        <Outlet />
      </main>
      <XPAnimations />
      <GemAnimations />
      <XPToast />
      <GlobalCelebrations />
    </div>
  );
}

function MigrationGate() {
  const { migrationPhase, dismissMigration } = useApp();
  return <MigrationOverlay migrationPhase={migrationPhase} onSkip={dismissMigration} />;
}

function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-slate-950 bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  // #region agent log
  fetch('http://127.0.0.1:7538/ingest/0124e581-c085-44a4-a338-4b8730b7c93b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecd604'},body:JSON.stringify({sessionId:'ecd604',location:'App.tsx:AppShell',message:'Auth gate decision',data:{supabaseConfigured,hasUser:Boolean(user),willShowAuth:supabaseConfigured&&!user,willBypassAuth:!supabaseConfigured},timestamp:Date.now(),hypothesisId:'H4-H5',runId:'post-fix'})}).catch(()=>{});
  // #endregion

  if (supabaseConfigured && !user) {
    return <Auth />;
  }

  const coachProfile = getCoachProfile();
  if (!coachProfile.onboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppProvider>
      <MigrationGate />
      <Routes location={location}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop" element={
            <ComingSoonGate status={FEATURE_FLAGS.shop} featureId="shop" name="Shop" description="Unlock power-ups and cosmetics with your earned gems." fallbackRoute="/" fallbackLabel="Go Home">
              <Shop />
            </ComingSoonGate>
          } />
          <Route path="/about" element={<About />} />
          <Route path="/accent-analyzer" element={
            <ComingSoonGate status={FEATURE_FLAGS.accentAnalyzer} featureId="accentAnalyzer" name="Accent Analyzer" description="Get detailed pronunciation feedback powered by AI." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <AccentAnalyzer />
            </ComingSoonGate>
          } />
          <Route path="/listening-mode" element={
            <ComingSoonGate status={FEATURE_FLAGS.listeningMode} featureId="listeningMode" name="Listening Mode" description="Train your ear with comprehension exercises." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <ListeningMode />
            </ComingSoonGate>
          } />
          <Route path="/study-groups" element={
            <ComingSoonGate status={FEATURE_FLAGS.studyGroups} featureId="studyGroups" name="Study Groups" description="Learn together with friends and classmates." fallbackRoute="/progress" fallbackLabel="View Progress">
              <StudyGroups />
            </ComingSoonGate>
          } />
          <Route path="/rankings" element={
            <ComingSoonGate status={FEATURE_FLAGS.rankings} featureId="rankings" name="Rankings" description="Compete with learners around the world." fallbackRoute="/progress" fallbackLabel="View Progress">
              <Rankings />
            </ComingSoonGate>
          } />
          <Route path="/weakness-analysis" element={<WeaknessAnalysis />} />
          <Route path="/sentence-rebuilder" element={
            <ComingSoonGate status={FEATURE_FLAGS.sentenceRebuilder} featureId="sentenceRebuilder" name="Sentence Rebuilder" description="Drag-and-drop grammar exercises to reinforce sentence structure." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <SentenceRebuilder />
            </ComingSoonGate>
          } />
          <Route path="/rapid-fire" element={
            <ComingSoonGate status={FEATURE_FLAGS.rapidFire} featureId="rapidFire" name="Rapid Fire" description="60-second vocabulary sprint to test your word recall." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <RapidFire />
            </ComingSoonGate>
          } />
          <Route path="/speed-speaking" element={
            <ComingSoonGate status={FEATURE_FLAGS.speedSpeaking} featureId="speedSpeaking" name="Speed Speaking" description="Race against the clock with 60-second speaking challenges." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <SpeedSpeaking />
            </ComingSoonGate>
          } />
          <Route path="/friend-challenges" element={
            <ComingSoonGate status={FEATURE_FLAGS.friendChallenges} featureId="friendChallenges" name="Friend Challenges" description="Challenge your friends and track who improves faster." fallbackRoute="/progress" fallbackLabel="View Progress">
              <FriendChallenges />
            </ComingSoonGate>
          } />
          <Route path="/roadmap" element={
            <ComingSoonGate status={FEATURE_FLAGS.roadmap} featureId="roadmap" name="French Roadmap" description="Your personalised path from A1 to C1, milestone by milestone." fallbackRoute="/progress" fallbackLabel="View Progress">
              <FrenchRoadmap />
            </ComingSoonGate>
          } />
          <Route path="/fluency-heatmap" element={
            <ComingSoonGate status={FEATURE_FLAGS.fluencyHeatmap} featureId="fluencyHeatmap" name="Fluency Heatmap" description="Visualise when and how much you've been practising." fallbackRoute="/progress" fallbackLabel="View Progress">
              <FluencyHeatmap />
            </ComingSoonGate>
          } />
          <Route path="/story-mode" element={<StoryMode />} />
          <Route path="/scenario-architect" element={<ScenarioArchitect />} />
          <Route path="/scenario-architect/session" element={<ScenarioArchitectSession />} />
          <Route path="/word-drop" element={
            <ComingSoonGate status={FEATURE_FLAGS.wordDrop} featureId="wordDrop" name="Word Drop" description="Catch falling words before they hit the ground." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <WordDrop />
            </ComingSoonGate>
          } />
          <Route path="/mastery" element={
            <ComingSoonGate status={FEATURE_FLAGS.mastery} featureId="mastery" name="Mastery Journey" description="Track your CEFR progress across all grammar and vocab domains." fallbackRoute="/progress" fallbackLabel="View Progress">
              <MasteryJourney />
            </ComingSoonGate>
          } />
          <Route path="/boss-battle" element={
            <ComingSoonGate status={FEATURE_FLAGS.bossBattle} featureId="bossBattle" name="Boss Battle" description="Take on grammar bosses in high-stakes encounters." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <BossBattle />
            </ComingSoonGate>
          } />
          <Route path="/emoji-master" element={
            <ComingSoonGate status={FEATURE_FLAGS.emojiMaster} featureId="emojiMaster" name="Emoji Master" description="Match emojis to French words in rapid-fire rounds." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <EmojiMaster />
            </ComingSoonGate>
          } />
          <Route path="/mystery-box" element={<MysteryBox />} />
          <Route path="/survival" element={
            <ComingSoonGate status={FEATURE_FLAGS.survivalMode} featureId="survivalMode" name="Survival Mode" description="Answer questions correctly or lose a life — how far can you go?" fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <SurvivalMode />
            </ComingSoonGate>
          } />
          <Route path="/pronunciation-lab" element={
            <ComingSoonGate status={FEATURE_FLAGS.pronunciationLab} featureId="pronunciationLab" name="Pronunciation Lab" description="Drill individual sounds and phonemes with instant audio feedback." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <PronunciationLab />
            </ComingSoonGate>
          } />
          <Route path="/speaking-arena" element={
            <ComingSoonGate status={FEATURE_FLAGS.speakingArena} featureId="speakingArena" name="Speaking Arena" description="Competitive speaking battles against real opponents." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <SpeakingArena />
            </ComingSoonGate>
          } />
          <Route path="/challenges" element={
            <ComingSoonGate status={FEATURE_FLAGS.challenges} featureId="challenges" name="Challenges" description="Daily and weekly challenges to keep your streak alive." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <Challenges />
            </ComingSoonGate>
          } />
          <Route path="/daily-news" element={<DailyNewsFlash />} />
          {/* DEV-ONLY: coach belief debug dashboard. Tree-shaken out of prod builds. */}
          {import.meta.env.DEV && (
            <Route path="/debug/beliefs" element={<CoachBeliefDebug />} />
          )}
        </Route>

        <Route element={<ExamLayout />}>
          <Route path="/exam" element={<ExamMode />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        {/* Admin content management — gated on JWT app_metadata.role */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/questions" element={<QuestionList />} />
            <Route path="/admin/questions/new" element={<QuestionForm />} />
            <Route path="/admin/questions/:id/edit" element={<QuestionForm />} />
            <Route path="/admin/questions/:id/history" element={<VersionHistory kind="questions" />} />
            <Route path="/admin/scenarios" element={<ScenarioList />} />
            <Route path="/admin/scenarios/new" element={<ScenarioForm />} />
            <Route path="/admin/scenarios/:id/edit" element={<ScenarioForm />} />
            <Route path="/admin/scenarios/:id/history" element={<VersionHistory kind="scenarios" />} />
          </Route>
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
