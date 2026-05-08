import { createContext, useContext, useState, type ReactNode } from 'react';

export interface SessionState {
  isActive: boolean;
  sessionsCompletedToday: number;
  dailyGoal: number;
  lastSessionTime?: string;
  currentMode: 'practice' | 'exam' | 'roleplay' | null;
}

interface SessionContextType {
  session: SessionState;
  completeSession: (mode: 'practice' | 'exam' | 'roleplay') => void;
  resetDaily: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    isActive: false,
    sessionsCompletedToday: 2,
    dailyGoal: 3,
    currentMode: null,
  });

  const completeSession = (mode: 'practice' | 'exam' | 'roleplay') => {
    setSession(prev => ({
      ...prev,
      sessionsCompletedToday: prev.sessionsCompletedToday + 1,
      lastSessionTime: new Date().toISOString(),
      currentMode: mode,
    }));
  };

  const resetDaily = () => {
    setSession(prev => ({
      ...prev,
      sessionsCompletedToday: 0,
      lastSessionTime: undefined,
    }));
  };

  return (
    <SessionContext.Provider value={{ session, completeSession, resetDaily }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
