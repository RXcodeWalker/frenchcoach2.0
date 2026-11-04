import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';
import { TrackView } from '../services/telemetry/TrackView';
import { ContactDialog } from '../features/contact/ContactDialog';

/**
 * What the learner sees when the app crashes (the root Sentry.ErrorBoundary in
 * main.tsx). It sits outside BrowserRouter, so it navigates with
 * window.location rather than router hooks, and shows no technical detail —
 * the error itself has already gone to Sentry.
 */
export function AppErrorFallback() {
  // Outside every provider, so no account email is prefilled; the dialog asks for one.
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <TrackView event={{ name: 'error_screen_shown', props: { area: 'app_root' } }} />
      <div className="w-full max-w-sm rounded-card border border-hairline bg-surface p-8 flex flex-col items-center gap-5 text-center">
        <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-control bg-action-soft text-action-text">
          <RotateCcw size={20} />
        </span>
        <div className="space-y-2">
          <h1 className="text-title text-ink">Oups ! Something went wrong.</h1>
          <p className="text-body-s text-ink-muted">
            We&apos;ve been told about it. Reloading usually fixes it — your progress is saved on this device.
          </p>
        </div>
        <div className="w-full flex flex-col gap-2">
          <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => window.location.assign('/')}>
            Go home
          </Button>
          <Button size="lg" variant="quiet" className="w-full" onClick={() => setFeedbackOpen(true)}>
            Tell us what happened
          </Button>
        </div>
      </div>
      <ContactDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        route={window.location.pathname}
      />
    </div>
  );
}
