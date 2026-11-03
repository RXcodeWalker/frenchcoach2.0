import { Link, useLocation } from 'react-router-dom';
import { Inbox, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../pwa/useOnlineStatus';
import { useSavedAnswers } from '../features/learn/savedAnswers/useSavedAnswers';

/** Where the learner already sees saved answers, so the reminder would only repeat itself. */
const QUIET_PATHS = ['/learn'];

/**
 * One line above every screen (`exam`: the exam layout, offline notice only): "you're offline, here's what still works", or,
 * back online, a pointer to answers saved offline that are ready for feedback.
 */
export function ConnectionBanner({ exam = false }: { exam?: boolean }) {
  const online = useOnlineStatus();
  const { items } = useSavedAnswers();
  const { pathname } = useLocation();
  const ready = items.filter((a) => a.status === 'ready').length;

  if (!online) {
    return (
      <div role="status" className="flex items-start gap-2.5 border-b border-hairline bg-info-soft px-4 py-2.5 text-info-text md:px-6">
        <WifiOff size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <p className="text-body-s">
          <span className="font-semibold">You’re offline.</span>{' '}
          {exam
            ? 'An exam needs a connection to hear you and mark your answers. Learn and the games in Explore work offline.'
            : 'Games still work, and Learn saves your answers for feedback later.'}
        </p>
      </div>
    );
  }

  if (exam || ready === 0 || QUIET_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <div role="status" className="flex items-center gap-2.5 border-b border-hairline bg-progress-soft px-4 py-2.5 text-progress-text md:px-6">
      <Inbox size={16} aria-hidden="true" className="shrink-0" />
      <p className="flex-1 text-body-s">
        {ready === 1 ? 'An answer you saved offline is' : `${ready} answers you saved offline are`} ready for feedback.
      </p>
      <Link to="/learn/saved" className="shrink-0 text-label font-semibold underline underline-offset-2">
        Open
      </Link>
    </div>
  );
}
