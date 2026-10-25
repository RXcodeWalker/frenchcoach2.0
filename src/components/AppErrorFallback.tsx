import { Button } from './ui/Button';

/**
 * What the learner sees when the app crashes (the root Sentry.ErrorBoundary in
 * main.tsx). It sits outside BrowserRouter, so it navigates with
 * window.location rather than router hooks, and shows no technical detail —
 * the error itself has already gone to Sentry.
 */
export function AppErrorFallback() {
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="surface w-full max-w-sm rounded-2xl border border-hairline p-8 flex flex-col items-center gap-5 text-center">
        <span aria-hidden="true" className="text-4xl">🥐</span>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-ink">Oups ! Something went wrong.</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
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
        </div>
      </div>
    </div>
  );
}
