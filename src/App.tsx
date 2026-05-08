import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { XPAnimations } from './components/XPAnimation';
import { SideRail } from './components/Navigation';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { ExamMode } from './screens/ExamMode';
import { Explore } from './screens/Explore';
import { Progress } from './screens/Progress';
import { Profile } from './screens/Profile';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function AppContent() {
  const { state } = useApp();
  const isExamFullscreen = state.screen === 'exam';

  const getScreen = () => {
    switch (state.screen) {
      case 'home': return <Home />;
      case 'learn': return <Learn />;
      case 'exam': return <ExamMode />;
      case 'explore': return <Explore />;
      case 'progress': return <Progress />;
      case 'profile': return <Profile />;
    }
  };

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* Background atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-electric/3 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-indigo-500/2 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-violet-electric/2 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Side Rail Navigation */}
      {!isExamFullscreen && <SideRail />}

      {/* Main Content with page transitions */}
      <main className={`relative z-10 ${!isExamFullscreen ? 'md:ml-[64px]' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={state.screen}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {getScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* XP Animations */}
      <XPAnimations />

      {/* XP Toast */}
      {state.showXPModal && (
        <motion.div
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex items-center gap-3 glass-elevated border-emerald-500/20 rounded-xl px-4 py-2.5">
            <span className="text-base">⚡</span>
            <div>
              <p className="font-black text-emerald-400 text-xs">+{state.lastXPGained} XP</p>
              <p className="text-[9px] text-slate-600">Keep going!</p>
            </div>
          </div>
        </motion.div>
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
