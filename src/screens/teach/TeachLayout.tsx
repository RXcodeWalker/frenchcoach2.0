import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSfxSilence } from '../../services/sound/useSfx';

/**
 * The teacher area's own layout (docs/systems/teacher-dashboard.md §3): desktop-first,
 * no learner nav, no XP/streak bar, no sound. Signed-in accounts only — a guest has no
 * classes. A teacher account can still open the learner app from the header.
 */
export function TeachLayout() {
  const { user } = useAuth();
  const location = useLocation();
  useSfxSilence();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <div className="min-h-screen bg-bg text-ink overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-4">
          <Link to="/teach" className="flex items-center gap-2 text-section text-ink">
            <GraduationCap size={18} aria-hidden="true" />
            Teacher
          </Link>
          <Link to="/" className="text-label text-ink-muted hover:text-ink">
            Open the learner app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-4 pb-16 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
