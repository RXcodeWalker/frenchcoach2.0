import { AppProvider, useApp } from './context/AppContext';
import { XPAnimations } from './components/XPAnimation';
import { SideRail } from './components/Navigation';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { ExamMode } from './screens/ExamMode';
import { Explore } from './screens/Explore';
import { Progress } from './screens/Progress';
import { Profile } from './screens/Profile';

function AppContent() {
  const { state } = useApp();
  const isExamFullscreen = state.screen === 'exam';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Subtle background atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-cyan-500/4 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-800/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Side Rail Navigation (hidden during exam) */}
      {!isExamFullscreen && <SideRail />}

      {/* Main Content */}
      <main className={`relative z-10 ${!isExamFullscreen ? 'md:ml-[72px]' : ''}`}>
        {state.screen === 'home' && <Home />}
        {state.screen === 'learn' && <Learn />}
        {state.screen === 'exam' && <ExamMode />}
        {state.screen === 'explore' && <Explore />}
        {state.screen === 'progress' && <Progress />}
        {state.screen === 'profile' && <Profile />}
      </main>

      {/* XP Animations */}
      <XPAnimations />

      {/* XP Toast */}
      {state.showXPModal && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 xp-toast">
          <div className="flex items-center gap-3 bg-slate-800/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-5 py-3 shadow-[0_0_24px_rgba(52,211,153,0.12)]">
            <span className="text-lg">⚡</span>
            <div>
              <p className="font-black text-emerald-400 text-sm">+{state.lastXPGained} XP</p>
              <p className="text-[10px] text-slate-500">Keep going!</p>
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
