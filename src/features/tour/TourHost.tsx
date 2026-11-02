import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { track } from '../../services/telemetry/telemetryService';
import { GuidedTour, type TourEndInfo, type TourEndReason } from './GuidedTour';
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
/** How long the "you can replay it" note stays up after an early skip. */
const SKIP_NOTE_MS = 6000;

type Entry = 'auto' | 'replay';

/**
 * Mounted once in MainLayout (the layout that owns the nav the tour points
 * at). Opens the tour automatically on Home for a brand-new learner or guest,
 * and on demand when Profile's "Replay tour" asks. Finishing, skipping or
 * Escape all count as seen. Not shown on the Junior track, which has no exam
 * nav, or while the sign-in data migration overlay is up.
 *
 * Two UX rules live here rather than in the card: someone who bails out of an
 * automatic tour early is told where to get it back (a person who dismisses
 * help and can't find it again has been failed twice), and every start/exit is
 * counted — content-free — so the tour's drop-off is measurable.
 */
export function TourHost() {
  const { state, migrationPhase } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const replayRequested = useTourReplayRequested();
  const [open, setOpen] = useState(false);
  const [showSkipNote, setShowSkipNote] = useState(false);
  const autoChecked = useRef(false);
  const entryRef = useRef<Entry>('auto');

  const junior = state.learnerTrack === 'junior';
  const busy = migrationPhase !== null && migrationPhase !== 'complete';
  const onHome = location.pathname === '/';
  const sessionCount = state.recentSessions.length;

  const openTour = useCallback((entry: Entry) => {
    entryRef.current = entry;
    setShowSkipNote(false);
    setOpen(true);
    track({ name: 'tour_started', props: { entry } });
  }, []);

  useEffect(() => {
    if (!replayRequested || junior) return;
    consumeTourReplay();
    openTour('replay');
  }, [replayRequested, junior, openTour]);

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
      openTour('auto');
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [junior, busy, onHome, sessionCount, openTour]);

  useEffect(() => {
    if (!showSkipNote) return;
    const id = window.setTimeout(() => setShowSkipNote(false), SKIP_NOTE_MS);
    return () => window.clearTimeout(id);
  }, [showSkipNote]);

  const handleEnd = useCallback(
    (reason: TourEndReason, info: TourEndInfo) => {
      markTourSeen();
      setOpen(false);
      track({
        name: 'tour_ended',
        props: { entry: entryRef.current, reason, last_step: info.lastStep, steps_seen: info.stepsSeen },
      });
      // Skipped before the last step, and nobody asked for it: say where it lives.
      if (reason === 'skipped' && entryRef.current === 'auto') setShowSkipNote(true);
      if (reason === 'cta') navigate('/learn');
    },
    [navigate],
  );

  if (junior) return null;
  return (
    <>
      {open && <GuidedTour steps={TOUR_STEPS} onEnd={handleEnd} ctaLabel="Try a question" />}
      {showSkipNote && !open && (
        <div
          role="status"
          className="fixed left-4 right-4 bottom-24 z-[90] mx-auto max-w-sm rounded-card border border-hairline surface-raised px-4 py-3 text-body-s text-ink md:left-[104px] md:right-auto md:bottom-6 md:mx-0"
        >
          No problem. You can replay the tour any time from Profile.
        </div>
      )}
    </>
  );
}
