import { useNavigate, useLocation } from 'react-router-dom';
import type { Screen } from '../types';
import { BarChart3, BookOpen, Compass, GraduationCap, Home, Keyboard, User } from 'lucide-react';
import { requestShortcutHelp } from '../lib/keyboardShortcuts';
import { useShellChrome } from './layout/shellChrome';

// Launch scope (src/config/launchScope.ts): the five core destinations plus Explore, the hub for every other mode.
const NAV_ITEMS: { id: Screen; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'learn', label: 'Learn', Icon: BookOpen },
  { id: 'exam', label: 'Exam', Icon: GraduationCap },
  { id: 'explore', label: 'Explore', Icon: Compass },
  { id: 'progress', label: 'Progress', Icon: BarChart3 },
  { id: 'profile', label: 'Profile', Icon: User },
];

const toPath = (id: Screen): string => id === 'home' ? '/' : `/${id}`;

/** Which item is active for a path: Home only on `/`, the rest by prefix (the notebook belongs to Learn). */
function activeNavIndex(pathname: string): number {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/notebook')) return 1;
  return NAV_ITEMS.findIndex(item => item.id !== 'home' && pathname.startsWith(toPath(item.id)));
}

const RAIL_ITEM = 64;
const RAIL_GAP = 4;

/**
 * Desktop: an 88px rail — logo, then six 64px items (20px icon over a 12/600
 * label). Mobile: a bottom dock of the same six items at 56px. In both, one
 * action-soft pill slides to the active item (the `slide` motion).
 */
export function SideRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dockHidden } = useShellChrome();
  const active = activeNavIndex(location.pathname);

  const itemClass = (on: boolean) =>
    `relative flex flex-col items-center justify-center gap-1 rounded-control text-[12px] font-semibold leading-tight
     transition-colors duration-state ease-smooth ${on ? 'text-action-text' : 'text-ink-subtle hover:text-ink-muted'}`;

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed left-0 top-0 bottom-0 z-50 hidden w-[88px] flex-col items-center gap-6 border-r border-hairline bg-surface px-2 py-4 md:flex"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-control bg-action text-[22px] font-semibold leading-none text-action-ink">
          F
        </div>
        <div className="relative flex w-full flex-col" style={{ gap: RAIL_GAP }}>
          {active >= 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 rounded-control bg-action-soft transition-transform duration-slide ease-slide"
              style={{ height: RAIL_ITEM, transform: `translateY(${active * (RAIL_ITEM + RAIL_GAP)}px)` }}
            >
              <span className="absolute -left-2 top-[22px] h-5 w-[3px] rounded-r-[3px] bg-action" />
            </span>
          )}
          {NAV_ITEMS.map(({ id, label, Icon }, i) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(toPath(id))}
              data-tour={`nav-${id}`}
              aria-current={i === active ? 'page' : undefined}
              className={`${itemClass(i === active)} w-full`}
              style={{ height: RAIL_ITEM }}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={requestShortcutHelp}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          className="mt-auto flex h-10 w-10 items-center justify-center rounded-control text-ink-subtle transition-colors duration-state ease-smooth hover:text-ink-muted"
        >
          <Keyboard size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </nav>

      {!dockHidden && (
        <nav
          aria-label="Main"
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-hairline bg-surface px-2 pt-1.5 md:hidden"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="relative grid grid-cols-6 gap-1">
            {active >= 0 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 h-14 rounded-control bg-action-soft transition-transform duration-slide ease-slide"
                style={{ width: `calc((100% - ${(NAV_ITEMS.length - 1) * 4}px) / ${NAV_ITEMS.length})`, transform: `translateX(calc(${active * 100}% + ${active * 4}px))` }}
              />
            )}
            {NAV_ITEMS.map(({ id, label, Icon }, i) => (
              <button
                key={id}
                type="button"
                onClick={() => navigate(toPath(id))}
                data-tour={`nav-${id}`}
                aria-current={i === active ? 'page' : undefined}
                className={`${itemClass(i === active)} h-14`}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
