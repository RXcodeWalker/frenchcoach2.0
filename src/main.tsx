import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { initTelemetry } from './services/telemetry/telemetryService';
import { AppErrorFallback } from './components/AppErrorFallback';
import { startBackendWarmup } from './services/api/backendWarmup';
import { initInstallPrompt } from './pwa/installPrompt';
import { preloadScreenFor } from './routing/screens';
import App from './App.tsx';
import './index.css';

// Session Replay is a separate download, fetched after first paint (the import() is
// here, not in telemetryService, so app-core keeps its stable chunk — vite.config.ts).
initTelemetry({ loadReplay: () => import('./services/telemetry/sentryReplay') });
startBackendWarmup();
initInstallPrompt();

// Code splitting: the screen in the URL starts downloading now, alongside the
// sign-in check, rather than after it. The service worker (offline support) is
// registered later, from the app shell — see src/pwa/registerServiceWorker.ts.
void preloadScreenFor(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={<AppErrorFallback />}
      beforeCapture={(scope) => {
        scope.setTag('area', 'app_root');
        scope.setLevel('fatal');
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
