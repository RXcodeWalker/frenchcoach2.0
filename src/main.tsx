import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { initTelemetry } from './services/telemetry/telemetryService';
import { pingContentServiceHealth } from './data/exam/bank/loader';
import App from './App.tsx';
import './index.css';

initTelemetry();
pingContentServiceHealth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
