import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';
import { Home, BookOpen, GraduationCap, BarChart3, User, Compass, Flame, Users, ShoppingBag, Trophy, Info, Cloud, CloudOff } from 'lucide-react';
import { AuthModal } from './AuthModal';

// Four primary destinations, then the game layer below the divider (Component
// Kit §03). No per-item colour — the rail has one active treatment.
const PRIMARY_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={19} /> },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={19} /> },
  { id: 'exam', label: 'Exam', icon: <GraduationCap size={19} /> },
  { id: 'progress', label: 'Progress', icon: <BarChart3 size={19} /> },
];

const GAME_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'explore', label: 'Explore', icon: <Compass size={19} /> },
  { id: 'shop', label: 'Shop', icon: <ShoppingBag size={19} /> },
  { id: 'rankings', label: 'Rankings', icon: <Trophy size={19} /> },
  { id: 'study-groups', label: 'Groups', icon: <Users size={19} /> },
  { id: 'profile', label: 'Profile', icon: <User size={19} /> },
  { id: 'about', label: 'About', icon: <Info size={19} /> },
];

const MOBILE_ITEMS = [...PRIMARY_ITEMS, GAME_ITEMS[0]];

const toPath = (id: Screen): string => id === 'home' ? '/' : `/${id}`;

function RailItem({ id, label, icon, active, onClick }: { id: Screen; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      key={id}
      onClick={onClick}
      className={`group relative w-full rounded-control flex flex-col items-center gap-1 py-2
        transition-colors duration-state ease-smooth
        ${active ? 'bg-action-soft text-action-text' : 'text-ink-subtle hover:text-ink-muted'}`}
    >
      {/* 3px active tab, flush to the rail edge */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-action" />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10 text-[11px] font-semibold">{label}</span>
    </button>
  );
}

export function SideRail() {
  const { state, authUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      {/* Desktop Side Rail — 88px, one active treatment for every item */}
      <nav className="nav-rail fixed left-0 top-0 bottom-0 w-[88px] surface border-r border-hairline z-50 hidden md:flex flex-col items-center py-5 px-2 gap-1">
        <div className="w-9 h-9 rounded-control bg-action flex items-center justify-center mb-6">
          <span className="text-sm font-semibold text-action-ink">F</span>
        </div>

        <div className="flex-1 flex flex-col items-stretch gap-0.5 w-full">
          {PRIMARY_ITEMS.map(item => (
            <RailItem
              key={item.id}
              {...item}
              active={location.pathname === toPath(item.id)}
              onClick={() => navigate(toPath(item.id))}
            />
          ))}

          {/* Divider: work above, reward below */}
          <div className="h-px bg-hairline my-2 mx-1.5" />

          {GAME_ITEMS.map(item => (
            <RailItem
              key={item.id}
              {...item}
              active={location.pathname === toPath(item.id)}
              onClick={() => navigate(toPath(item.id))}
            />
          ))}
        </div>

        {/* Cloud sync */}
        <button
          onClick={() => setShowAuth(true)}
          className="w-9 h-9 rounded-control flex items-center justify-center mb-1 transition-colors duration-state ease-smooth text-ink-subtle hover:text-ink-muted"
          title={authUser ? `Signed in: ${authUser.email}` : 'Sign in to sync'}
        >
          {authUser ? <Cloud size={16} className="text-progress-text" /> : <CloudOff size={16} />}
        </button>

        {/* Streak */}
        <div className="flex flex-col items-center gap-1 mb-1">
          <Flame size={16} className="text-streak-text" />
          <span className="font-numeral text-[11px] text-streak-text tabular-nums">{state.profile.streak_days}</span>
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Mobile Bottom Dock — the rail is replaced, not shrunk */}
      <nav className="nav-rail fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-3 mb-3 px-1.5 py-1.5 surface-raised rounded-xl">
          <div className="flex items-center justify-around">
            {MOBILE_ITEMS.map(item => {
              const active = location.pathname === toPath(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(toPath(item.id))}
                  className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-control min-h-[44px] justify-center
                    transition-colors duration-state ease-smooth
                    ${active ? 'bg-action-soft text-action-text' : 'text-ink-subtle'}`}
                >
                  <span className="relative z-10">{item.icon}</span>
                  <span className="text-[11px] font-semibold relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
