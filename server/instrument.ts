// Imported first by server/index.ts so Sentry is listening before any other
// module runs (including the env check that throws at boot).
import { initServerSentry } from './sentry';

initServerSentry();
