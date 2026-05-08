import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { XPAnimations } from './components/XPAnimation';
import { LevelUpCelebration, AchievementUnlockedCelebration } from './components/CelebrationModals';
import { BottomNavigation } from './components/TopContextBar';
import { DashboardNew } from './screens/DashboardNew';
import { PracticeNew } from './screens/PracticeNew';
import { ExamMode } from './screens/ExamMode';
import { Roleplay } from './screens/Roleplay';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';

function AppContent() {
  const { state, dispatch } = useApp();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showAchievementUnlock, setShowAchievementUnlock] = useState(false);
  const isExamFullscreen = state.screen === 'exam';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-cyan-500/6 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-800/8 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <main className="relative z-10">
        {state.screen === 'exam' ? (
          <ExamMode />
        ) : (
          <>
            {state.screen === 'dashboard' && <DashboardNew />}
            {state.screen === 'practice' && <PracticeNew />}
            {state.screen === 'roleplay' && <Roleplay />}
            {state.screen === 'progress' && <Progress />}
            {state.screen === 'settings' && <Settings />}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Celebration Modals */}
      {showLevelUp && <LevelUpCelebration level="Advanced" onDismiss={() => setShowLevelUp(false)} />}
      {showAchievementUnlock && (
        <AchievementUnlockedCelebration
          name="Marathon Runner"
          icon="🏃"
          description="You've completed 50 sessions!"
          xpReward={250}
          onDismiss={() => setShowAchievementUnlock(false)}
        />
      )}

      {/* XP Animations */}
      <XPAnimations />

      {/* XP Toast */}
      {state.showXPModal && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 xp-toast">
          <div className="flex items-center gap-3 bg-slate-800/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-6 py-4 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-black text-emerald-400">+{state.lastXPGained} XP earned!</p>
              <p className="text-xs text-slate-400">Keep going! 🔥</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
