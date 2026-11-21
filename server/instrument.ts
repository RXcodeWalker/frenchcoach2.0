// Loaded two ways, both before anything else runs:
//  - in production, `node --import ./dist/instrument.js dist/server.js` (the
//    `start:server` script) so Sentry can hook Express, HTTP and fetch for
//    traces — that only works when it is initialised ahead of the app's own
//    imports, which an `import` inside the bundle cannot do;
//  - as the first import of server/index.ts (the line below), so Sentry is
//    listening before the env check that throws at boot even when started
//    some other way. A second initialisation is a no-op (initServerSentry).
import { initServerSentry } from './sentry';

initServerSentry();
