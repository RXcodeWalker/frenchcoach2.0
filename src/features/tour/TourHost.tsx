import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { GuidedTour, type TourEndReason } from './GuidedTour';
import { TOUR_STEPS } from './tourSteps';
import {
  consumeTourReplay,
  hasSeenTour,
  markTourSeen,
  shouldAutoStartTour,
  useTourReplayRequested,
} from './tourState';

/** Lets Home's entrance transition settle before the scrim comes down. */
const AUTO_START_DELAY_MS = 700;

/**
 * Mounted once in MainLayout (the layout that owns the nav the tour points
 * at). Opens the tour automatically on Home for a brand-new learner or guest,
 * and on demand when Profile's "Replay tour" asks. Finishing, skipping or
 * Escape all count as seen. Not shown on the Junior track, which has no exam
 * nav, or while the sign-in data migration overlay is up.
 */
export function TourHost() {
  const { state, migrationPhase } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const replayRequested = useTourReplayRequested();
  const [open, setOpen] = useState(false);
  const autoChecked = useRef(false);

  const junior = state.learnerTrack === 'junior';
  const busy = migrationPhase !== null && migrationPhase !== 'complete';
  const onHome = location.pathname === '/';
  const sessionCount = state.recentSessions.length;

  useEffect(() => {
    if (!replayRequested || junior) return;
    consumeTourReplay();
    setOpen(true);
  }, [replayRequested, junior]);

  useEffect(() => {
    if (autoChecked.current || junior || busy || !onHome) return;
    if (!shouldAutoStartTour({ seen: hasSeenTour(), sessionCount })) {
      autoChecked.current = true;
      return;
    }
    // Decided only when the timer fires: if synced sessions arrive (or the
    // learner leaves Home) during the delay, the effect re-runs and re-checks.
    const id = window.setTimeout(() => {
      autoChecked.current = true;
      setOpen(true);
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [junior, busy, onHome, sessionCount]);

  const handleEnd = useCallback(
    (reason: TourEndReason) => {
      markTourSeen();
      setOpen(false);
      if (reason === 'cta') navigate('/learn');
    },
    [navigate],
  );

  if (!open || junior) return null;
  return <GuidedTour steps={TOUR_STEPS} onEnd={handleEnd} ctaLabel="Start with Learn" />;
}
