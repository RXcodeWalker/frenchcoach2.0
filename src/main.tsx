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

initTelemetry();
startBackendWarmup();
initInstallPrompt();

// Code splitting: the screen in the URL starts downloading now, alongside the
// sign-in check, rather than after it. The service worker (offline support) is
// registered later, from the app shell — see src/pwa/registerServiceWorker.ts.
void preloadScreenFor(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<AppErrorFallback />}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
