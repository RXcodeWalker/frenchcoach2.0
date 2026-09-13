import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { initTelemetry } from './services/telemetry/telemetryService';
import { startBackendWarmup } from './services/api/backendWarmup';
import App from './App.tsx';
import './index.css';

initTelemetry();
startBackendWarmup();

// Best-effort — no user-visible error on failure (unsupported browser,
// insecure context, etc). Needed for Phase 4.3's Web Push notifications.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
