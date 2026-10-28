import { useEffect } from 'react';
import { Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { route } from './components/motion/variants';
import { ShellChromeProvider } from './components/layout/ShellChromeProvider';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicRoutes } from './PublicRoutes';
import { XPAnimations } from './components/XPAnimation';
import { GemAnimations } from './components/GemAnimation';
import { SideRail } from './components/Navigation';
import { Home } from './screens/Home';
import { JuniorHome } from './screens/junior/JuniorHome';
import { MissionPlayer } from './screens/junior/MissionPlayer';
import { Learn } from './screens/Learn';
import { Notebook } from './screens/Notebook';
import { MonthlyCheckScreen } from './screens/MonthlyCheckScreen';
import { ExamMode } from './screens/ExamMode';
import { Explore } from './screens/Explore';
import { Progress } from './screens/Progress';
import { Profile } from './screens/Profile';
import { Shop } from './screens/Shop';
import { About } from './screens/About';
import { StudyGroups } from './screens/StudyGroups';
import { Rankings } from './screens/Rankings';
import { DailyChallenge } from './screens/DailyChallenge';
import { League } from './screens/League';
import { DuelDetail } from './screens/DuelDetail';
import { WeaknessAnalysis } from './screens/WeaknessAnalysis';
import { SentenceRebuilder } from './screens/SentenceRebuilder';
import { Onboarding } from './screens/Onboarding';
import { OnboardingPlacement } from './screens/OnboardingPlacement';
import { useGuestMode } from './hooks/useGuestMode';
import { IdentityScopeGate } from './components/IdentityScopeGate';
import { OnboardingCheck } from './components/OnboardingCheck';
import { AgeBandCheck } from './components/AgeBandCheck';
import { AgeBand } from './screens/AgeBand';
import { InviteGateCheck } from './components/InviteGateCheck';
import { InviteCode } from './screens/InviteCode';

import { RapidFire } from './screens/RapidFire';
import { SpeedSpeaking } from './screens/SpeedSpeaking';
import { FriendChallenges } from './screens/FriendChallenges';
import { FrenchRoadmap } from './screens/FrenchRoadmap';
import { FluencyHeatmap } from './screens/FluencyHeatmap';
import { StoryMode } from './screens/StoryMode';
import { ScenarioArchitect } from './screens/ScenarioArchitect';
import { ScenarioArchitectSession } from './screens/ScenarioArchitectSession';
import { RoleplaySession } from './screens/RoleplaySession';
import { WordDrop } from './screens/WordDrop';
import { MasteryJourney } from './screens/MasteryJourney';
import { BossBattle } from './screens/BossBattle';
import { EmojiMaster } from './screens/EmojiMaster';
import { MysteryBox } from './screens/MysteryBox';
import { SurvivalMode } from './screens/SurvivalMode';
import { AccentAnalyzer } from './screens/AccentAnalyzer';
import { ListeningMode } from './screens/ListeningMode';
import { SpeakingArena } from './screens/SpeakingArena';
import { Challenges } from './screens/Challenges';
import { DailyNewsFlash } from './screens/DailyNewsFlash';
import { CoachBeliefDebug } from './screens/CoachBeliefDebug';
import { JuniorPlaytest } from './screens/JuniorPlaytest';
import { NotFound } from './screens/NotFound';
import { IgcseFrenchSpeaking } from './screens/IgcseFrenchSpeaking';
import { FrenchRoleplayPractice } from './screens/FrenchRoleplayPractice';
import { Story } from './screens/Story';
import { PrivacyPolicy } from './screens/PrivacyPolicy';
import { TermsOfService } from './screens/TermsOfService';
import { AdminRoute } from './components/auth/AdminRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './screens/admin/AdminDashboard';
import { InviteCodeList } from './screens/admin/InviteCodeList';
import { QuestionList } from './screens/admin/questions/QuestionList';
import { QuestionForm } from './screens/admin/questions/QuestionForm';
import { ScenarioList } from './screens/admin/scenarios/ScenarioList';
import { ScenarioForm } from './screens/admin/scenarios/ScenarioForm';
import { VersionHistory } from './screens/admin/VersionHistory';
import { LevelUpCelebration, AchievementUnlocked, XPEarnedToast } from './components/CelebrationModals';
import { MigrationOverlay } from './components/MigrationOverlay';
import { ComingSoonGate } from './components/ComingSoonGate';
import { resolveFeatureStatus } from './config/featureFlags';
import { isHiddenPath } from './config/launchScope';
import { TourHost } from './features/tour/TourHost';
import { supabaseConfigured } from './lib/supabase';
import { AnalyticsTracker, AnalyticsPersonSync } from './services/telemetry/AnalyticsTracker';

// Route change: a plain fade (Design System v2 'enter' — the cards inside rise).
const pageVariants = route;

function GlobalCelebrations() {
  const { state, dispatch } = useApp();

  return (
    <AnimatePresence>
      {state.newLevelReached && (
        <LevelUpCelebration
          key="level"
          newLevel={state.newLevelReached}
          onDismiss={() => dispatch({ type: 'DISMISS_CELEBRATIONS' })}
        />
      )}
      {!state.newLevelReached && state.lastUnlockedAchievement && (
        <AchievementUnlocked
          key="achievement"
          id={state.lastUnlockedAchievement.id}
          name={state.lastUnlockedAchievement.name}
          description={state.lastUnlockedAchievement.description}
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
  }, [state.showXPModal, dispatch]);
  // A level-up or achievement toast takes the slot; the top bar's XP pill still counts up.
  const busy = !!state.newLevelReached || !!state.lastUnlockedAchievement;
  return (
    <AnimatePresence>
      {state.showXPModal && !busy && (
        <XPEarnedToast amount={state.lastXPGained} onDismiss={() => dispatch({ type: 'DISMISS_XP_MODAL' })} />
      )}
    </AnimatePresence>
  );
}

/** `/` is the Junior home for an account on the Junior track, the exam Home otherwise. */
function HomeRoute() {
  const { state } = useApp();
  return state.learnerTrack === 'junior' ? <JuniorHome /> : <Home />;
}

function MainLayout() {
  const location = useLocation();
  const { state } = useApp();
  // The exam side rail (IGCSE tools, rankings, leagues) is not part of the Junior track (junior-track §10).
  const junior = state.learnerTrack === 'junior';
  // Launch scope: hidden features redirect home instead of rendering.
  if (isHiddenPath(location.pathname)) return <Navigate to="/" replace />;
  return (
    <ShellChromeProvider>
    <div className="min-h-screen bg-bg text-ink overflow-x-clip">
      {!junior && <SideRail />}
      <main className={`relative z-10 ${junior ? '' : 'md:ml-[88px]'}`}>
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
      <TourHost />
    </div>
    </ShellChromeProvider>
  );
}

function ExamLayout() {
  // The warm-paper exam voice is the only exam presentation, and it ignores the
  // app's light/dark theme (see styles/exam-voice.css).
  return (
    <div data-hatch="immersive" className="min-h-screen bg-bg text-ink overflow-hidden exam-voice">
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
  const { isGuest } = useGuestMode();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  // '/login' is an intentionally unregistered pathname: it never appears as a
  // <Route> below, it only exists here to force the auth screen back up for a
  // guest who wants to convert to a real account, without clearing guestMode.
  // PublicRoutes renders it (and every other public/unmatched path) via its
  // own <Auth /> route, preserving the same behavior as the old direct return.
  if (supabaseConfigured && !user && (!isGuest || location.pathname === '/login')) {
    return <PublicRoutes />;
  }

  const identity = user?.id ?? 'guest';

  return (
    <IdentityScopeGate key={identity} identity={identity}>
      <InviteGateCheck>
      <AgeBandCheck>
      <OnboardingCheck>
        <AppProvider identity={identity}>
          <MigrationGate />
          <AnalyticsPersonSync />
          <Routes location={location}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/junior" element={<JuniorHome />} />
          <Route path="/junior/:themeId" element={<MissionPlayer />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/learn/sounds/check" element={
            <ComingSoonGate status={resolveFeatureStatus('pronunciationLab')} featureId="pronunciationLab" name="Monthly sound check" description="The same five sentences once a month — the fair way to see your pronunciation change." fallbackRoute="/progress" fallbackLabel="View Progress">
              <MonthlyCheckScreen />
            </ComingSoonGate>
          } />
          <Route path="/explore" element={<Explore />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop" element={
            <ComingSoonGate status={resolveFeatureStatus('shop')} featureId="shop" name="Shop" description="Unlock power-ups and cosmetics with your earned gems." fallbackRoute="/" fallbackLabel="Go Home">
              <Shop />
            </ComingSoonGate>
          } />
          <Route path="/about" element={<About />} />
          <Route path="/accent-analyzer" element={
            <ComingSoonGate status={resolveFeatureStatus('accentAnalyzer')} featureId="accentAnalyzer" name="Accent Analyzer" description="Get detailed pronunciation feedback powered by AI." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <AccentAnalyzer />
            </ComingSoonGate>
          } />
          <Route path="/listening-mode" element={
            <ComingSoonGate status={resolveFeatureStatus('listeningMode')} featureId="listeningMode" name="Listening Mode" description="Train your ear with comprehension exercises." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <ListeningMode />
            </ComingSoonGate>
          } />
          <Route path="/study-groups" element={
            <ComingSoonGate status={resolveFeatureStatus('studyGroups')} featureId="studyGroups" name="Study Groups" description="Learn together with friends and classmates." fallbackRoute="/progress" fallbackLabel="View Progress">
              <StudyGroups />
            </ComingSoonGate>
          } />
          <Route path="/rankings" element={
            <ComingSoonGate status={resolveFeatureStatus('rankings')} featureId="rankings" name="Rankings" description="Compete with learners around the world." fallbackRoute="/progress" fallbackLabel="View Progress">
              <Rankings />
            </ComingSoonGate>
          } />
          <Route path="/daily-challenge" element={
            <ComingSoonGate status={resolveFeatureStatus('dailyChallenge')} featureId="dailyChallenge" name="Daily Challenge" description="One shared question set a day — same challenge, same day, for everyone." fallbackRoute="/" fallbackLabel="Go Home">
              <DailyChallenge />
            </ComingSoonGate>
          } />
          <Route path="/league" element={
            <ComingSoonGate status={resolveFeatureStatus('league')} featureId="league" name="League Power" description="Weekly XP cohorts — climb the ranks, promote, don't get demoted." fallbackRoute="/rankings" fallbackLabel="View Rankings">
              <League />
            </ComingSoonGate>
          } />
          <Route path="/weakness-analysis" element={<WeaknessAnalysis />} />
          <Route path="/sentence-rebuilder" element={
            <ComingSoonGate status={resolveFeatureStatus('sentenceRebuilder')} featureId="sentenceRebuilder" name="Sentence Rebuilder" description="Drag-and-drop grammar exercises to reinforce sentence structure." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <SentenceRebuilder />
            </ComingSoonGate>
          } />
          <Route path="/rapid-fire" element={
            <ComingSoonGate status={resolveFeatureStatus('rapidFire')} featureId="rapidFire" name="Rapid Fire" description="60-second vocabulary sprint to test your word recall." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <RapidFire />
            </ComingSoonGate>
          } />
          <Route path="/speed-speaking" element={
            <ComingSoonGate status={resolveFeatureStatus('speedSpeaking')} featureId="speedSpeaking" name="Speed Speaking" description="Race against the clock with 60-second speaking challenges." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <SpeedSpeaking />
            </ComingSoonGate>
          } />
          <Route path="/friend-challenges" element={
            <ComingSoonGate status={resolveFeatureStatus('friendChallenges')} featureId="friendChallenges" name="Friend Challenges" description="Challenge your friends and track who improves faster." fallbackRoute="/progress" fallbackLabel="View Progress">
              <FriendChallenges />
            </ComingSoonGate>
          } />
          <Route path="/duel/:duelId" element={
            <ComingSoonGate status={resolveFeatureStatus('friendChallenges')} featureId="friendChallenges" name="Friend Duels" description="Challenge a friend to a head-to-head speaking duel." fallbackRoute="/friend-challenges" fallbackLabel="Back to Challenges">
              <DuelDetail />
            </ComingSoonGate>
          } />
          <Route path="/roadmap" element={
            <ComingSoonGate status={resolveFeatureStatus('roadmap')} featureId="roadmap" name="French Roadmap" description="Your personalised path from A1 to C1, milestone by milestone." fallbackRoute="/progress" fallbackLabel="View Progress">
              <FrenchRoadmap />
            </ComingSoonGate>
          } />
          <Route path="/fluency-heatmap" element={
            <ComingSoonGate status={resolveFeatureStatus('fluencyHeatmap')} featureId="fluencyHeatmap" name="Fluency Heatmap" description="Visualise when and how much you've been practising." fallbackRoute="/progress" fallbackLabel="View Progress">
              <FluencyHeatmap />
            </ComingSoonGate>
          } />
          <Route path="/story-mode" element={<StoryMode />} />
          <Route path="/scenario/:scenarioId" element={<RoleplaySession />} />
          <Route path="/scenario-architect" element={<ScenarioArchitect />} />
          <Route path="/scenario-architect/session" element={<ScenarioArchitectSession />} />
          <Route path="/word-drop" element={
            <ComingSoonGate status={resolveFeatureStatus('wordDrop')} featureId="wordDrop" name="Word Drop" description="Catch falling words before they hit the ground." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <WordDrop />
            </ComingSoonGate>
          } />
          <Route path="/mastery" element={
            <ComingSoonGate status={resolveFeatureStatus('mastery')} featureId="mastery" name="Mastery Journey" description="Track your CEFR progress across all grammar and vocab domains." fallbackRoute="/progress" fallbackLabel="View Progress">
              <MasteryJourney />
            </ComingSoonGate>
          } />
          <Route path="/boss-battle" element={
            <ComingSoonGate status={resolveFeatureStatus('bossBattle')} featureId="bossBattle" name="Boss Battle" description="Take on grammar bosses in high-stakes encounters." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <BossBattle />
            </ComingSoonGate>
          } />
          <Route path="/emoji-master" element={
            <ComingSoonGate status={resolveFeatureStatus('emojiMaster')} featureId="emojiMaster" name="Emoji Master" description="Match emojis to French words in rapid-fire rounds." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <EmojiMaster />
            </ComingSoonGate>
          } />
          <Route path="/mystery-box" element={<MysteryBox />} />
          <Route path="/survival" element={
            <ComingSoonGate status={resolveFeatureStatus('survivalMode')} featureId="survivalMode" name="Survival Mode" description="Answer questions correctly or lose a life — how far can you go?" fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <SurvivalMode />
            </ComingSoonGate>
          } />
          {/* PronunciationLab absorbed into AccentAnalyzer (accent-analyzer plan §16) — redirect, don't 404 old links/bookmarks. */}
          <Route path="/pronunciation-lab" element={<Navigate to="/accent-analyzer" replace />} />
          <Route path="/speaking-arena" element={
            <ComingSoonGate status={resolveFeatureStatus('speakingArena')} featureId="speakingArena" name="Speaking Arena" description="Competitive speaking battles against real opponents." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <SpeakingArena />
            </ComingSoonGate>
          } />
          <Route path="/challenges" element={
            <ComingSoonGate status={resolveFeatureStatus('challenges')} featureId="challenges" name="Challenges" description="Daily and weekly challenges to keep your streak alive." fallbackRoute="/learn" fallbackLabel="Practice Speaking">
              <Challenges />
            </ComingSoonGate>
          } />
          <Route path="/daily-news" element={<DailyNewsFlash />} />
          {/* DEV-ONLY: coach belief debug dashboard. Tree-shaken out of prod builds. */}
          {import.meta.env.DEV && (
            <>
              <Route path="/debug/beliefs" element={<CoachBeliefDebug />} />
              <Route path="/debug/junior-playtest" element={<JuniorPlaytest />} />
            </>
          )}
          {/* Catch-all for signed-in/guest users hitting an unregistered app path.
              Client-side fallback only — vercel.json's rewrite is what makes a hard
              load of an unknown URL reach React at all. */}
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<ExamLayout />}>
          <Route path="/exam" element={<ExamMode />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/onboarding/placement" element={<OnboardingPlacement />} />
        </Route>

        {/* Marketing pages, reachable for signed-in/guest users via footer
            links on the other marketing pages. Each renders its own
            MarketingLayout — no MainLayout/AppProvider chrome needed. */}
        <Route path="/igcse-french-speaking" element={<IgcseFrenchSpeaking />} />
        <Route path="/french-roleplay-practice" element={<FrenchRoleplayPractice />} />
        <Route path="/story" element={<Story />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/age-band" element={<AgeBand />} />
        <Route path="/invite-code" element={<InviteCode />} />

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
            <Route path="/admin/invite-codes" element={<InviteCodeList />} />
          </Route>
        </Route>
          </Routes>
        </AppProvider>
      </OnboardingCheck>
      </AgeBandCheck>
      </InviteGateCheck>
    </IdentityScopeGate>
  );
}

export default function App() {
  // reducedMotion="user": under the OS setting framer-motion drops transform
  // motion and keeps the fade (Design System v2: enter becomes a fade).
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AnalyticsTracker />
        <AppShell />
      </AuthProvider>
    </MotionConfig>
  );
}
