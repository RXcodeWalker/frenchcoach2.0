import { useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Zap } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
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
import { LevelUpCelebration, AchievementUnlocked } from './components/CelebrationModals';

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
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 bg-gradient-to-br from-slate-100 via-blue-50/30 to-primary/5 animate-aurora-shift" />
      <div className="absolute -top-40 -left-40 w-96 h-96 dark:bg-primary/8 bg-primary/6 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-32 w-80 h-80 dark:bg-primary-variant/5 bg-primary-variant/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/3 w-72 h-72 dark:bg-primary/6 bg-primary-variant/6 rounded-full blur-3xl animate-blob animation-delay-4000" />
      <div className="absolute top-1/4 left-1/4 w-80 h-80 dark:bg-primary-variant/3 bg-primary/8 rounded-full blur-3xl animate-blob animation-delay-6000" />
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

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/about" element={<About />} />
          <Route path="/accent-analyzer" element={<AccentAnalyzer />} />
          <Route path="/listening-mode" element={<ListeningMode />} />
          <Route path="/study-groups" element={<StudyGroups />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/weakness-analysis" element={<WeaknessAnalysis />} />
          <Route path="/sentence-rebuilder" element={<SentenceRebuilder />} />
          <Route path="/rapid-fire" element={<RapidFire />} />
          <Route path="/speed-speaking" element={<SpeedSpeaking />} />
          <Route path="/friend-challenges" element={<FriendChallenges />} />
          <Route path="/roadmap" element={<FrenchRoadmap />} />
          <Route path="/fluency-heatmap" element={<FluencyHeatmap />} />
          <Route path="/story-mode" element={<StoryMode />} />
          <Route path="/scenario-architect" element={<ScenarioArchitect />} />
          <Route path="/scenario-architect/session" element={<ScenarioArchitectSession />} />
          <Route path="/word-drop" element={<WordDrop />} />
          <Route path="/mastery" element={<MasteryJourney />} />
          <Route path="/boss-battle" element={<BossBattle />} />
          <Route path="/emoji-master" element={<EmojiMaster />} />
          <Route path="/mystery-box" element={<MysteryBox />} />
          <Route path="/survival" element={<SurvivalMode />} />
          <Route path="/pronunciation-lab" element={<PronunciationLab />} />
          <Route path="/speaking-arena" element={<SpeakingArena />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/daily-news" element={<DailyNewsFlash />} />
        </Route>

        <Route element={<ExamLayout />}>
          <Route path="/exam" element={<ExamMode />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
