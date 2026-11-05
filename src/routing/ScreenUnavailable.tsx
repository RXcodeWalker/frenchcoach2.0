import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useOnlineStatus } from '../pwa/useOnlineStatus';
import { reloader } from './lazyScreen';

/** What `RouteChunkBoundary` shows when a screen's code could not be downloaded. */
export function ScreenUnavailable({ onRetry, reloadNow = false }: { onRetry: () => void; reloadNow?: boolean }) {
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const canGoBack = typeof window !== 'undefined' && ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  const leave = () => (canGoBack ? navigate(-1) : navigate('/'));
  useEffect(() => {
    if (reloadNow && online) reloader.reload();
  }, [reloadNow, online]);

  return (
    <OnlineRetry online={online} onRetry={onRetry}>
      <div role="alert" data-testid="screen-unavailable" className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-card border border-hairline bg-surface p-8 text-center">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-control bg-action-soft text-action-text">
            {online ? <RotateCcw size={20} /> : <WifiOff size={20} />}
          </span>
          {online ? (
            <div className="space-y-2">
              <h1 className="text-title text-ink">This screen didn’t load</h1>
              <p className="text-body-s text-ink-muted">
                Your connection may be slow, or the app has just been updated. Reloading usually fixes it — your progress is saved.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h1 className="text-title text-ink">You’re offline</h1>
              <p className="text-body-s text-ink-muted">
                This screen isn’t saved on this device yet. It will open as soon as you’re back online, and work offline after that.
              </p>
            </div>
          )}
          <div className="flex w-full flex-col gap-2">
            {online && (
              <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
                Reload
              </Button>
            )}
            <Button size="lg" variant="secondary" className="w-full" onClick={leave}>
              {canGoBack ? 'Go back' : 'Go home'}
            </Button>
          </div>
        </div>
      </div>
    </OnlineRetry>
  );
}

/** Tries the download again the moment the connection comes back. */
function OnlineRetry({ online, onRetry, children }: { online: boolean; onRetry: () => void; children: ReactNode }) {
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current) onRetry();
    wasOnline.current = online;
  }, [online, onRetry]);
  return <>{children}</>;
}
