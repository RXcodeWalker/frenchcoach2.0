import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { initTelemetry } from './services/telemetry/telemetryService';
import { AppErrorFallback } from './components/AppErrorFallback';
import { startBackendWarmup } from './services/api/backendWarmup';
import { initInstallPrompt } from './pwa/installPrompt';
import App from './App.tsx';
import './index.css';

initTelemetry();
startBackendWarmup();
initInstallPrompt();

// Best-effort — no user-visible error on failure (unsupported browser,
// insecure context, etc). Web Push (Phase 4.3) and offline support
// (src/pwa/serviceWorker.ts: the app shell, games and recorded voices are
// cached; nothing that talks to a server about the learner ever is).
// `updateViaCache: 'none'` so a deploy's new worker is picked up straight away.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<AppErrorFallback />}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
