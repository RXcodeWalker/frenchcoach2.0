import { useNavigate, useLocation } from 'react-router-dom';
import type { Screen } from '../types';
import { Home, BookOpen, GraduationCap, BarChart3, User } from 'lucide-react';

// Launch scope (src/config/launchScope.ts): the five core destinations only.
// No per-item colour — the rail has one active treatment.
const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={19} /> },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={19} /> },
  { id: 'exam', label: 'Exam', icon: <GraduationCap size={19} /> },
  { id: 'progress', label: 'Progress', icon: <BarChart3 size={19} /> },
  { id: 'profile', label: 'Profile', icon: <User size={19} /> },
];

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
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {/* Desktop Side Rail — 88px, one active treatment for every item */}
      <nav className="nav-rail fixed left-0 top-0 bottom-0 w-[88px] surface border-r border-hairline z-50 hidden md:flex flex-col items-center py-5 px-2 gap-1">
        <div className="w-9 h-9 rounded-control bg-action flex items-center justify-center mb-6">
          <span className="text-sm font-semibold text-action-ink">F</span>
        </div>

        <div className="flex-1 flex flex-col items-stretch gap-0.5 w-full">
          {NAV_ITEMS.map(item => (
            <RailItem
              key={item.id}
              {...item}
              active={location.pathname === toPath(item.id)}
              onClick={() => navigate(toPath(item.id))}
            />
          ))}
        </div>
      </nav>

      {/* Mobile Bottom Dock — the rail is replaced, not shrunk */}
      <nav className="nav-rail fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-3 mb-3 px-1.5 py-1.5 surface-raised rounded-xl">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.map(item => {
              const active = location.pathname === toPath(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(toPath(item.id))}
                  className={`relative flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-control min-h-[44px] justify-center
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
