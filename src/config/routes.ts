export type RouteKind = 'public' | 'app' | 'dynamic' | 'unregistered' | 'dev-only';

export interface RouteEntry {
  path: string;
  kind: RouteKind;
  indexable: boolean;
}

// Single source of truth for every path the app can serve. Feeds the
// route-parity test, and (later) the shell generator, sitemap, and robots policy.
//
// kind:'unregistered' — never a <Route> in App.tsx (checked by AppShell before
// Routes renders) but still needs a static shell once prerendering exists, so it
// belongs in this table. Currently just '/login' (App.tsx:199-203).
// kind:'dev-only' — a <Route> guarded by import.meta.env.DEV; tree-shaken out of
// production builds, so it must never get a prod shell.
export const ROUTES: RouteEntry[] = [
  { path: '/', kind: 'app', indexable: true },
  { path: '/about', kind: 'public', indexable: true },
  { path: '/igcse-french-speaking', kind: 'public', indexable: true },
  { path: '/french-roleplay-practice', kind: 'public', indexable: true },

  { path: '/login', kind: 'unregistered', indexable: false },

  { path: '/learn', kind: 'app', indexable: false },
  { path: '/exam', kind: 'app', indexable: false },
  { path: '/explore', kind: 'app', indexable: false },
  { path: '/progress', kind: 'app', indexable: false },
  { path: '/profile', kind: 'app', indexable: false },
  { path: '/shop', kind: 'app', indexable: false },
  { path: '/rankings', kind: 'app', indexable: false },
  { path: '/onboarding', kind: 'app', indexable: false },
  { path: '/accent-analyzer', kind: 'app', indexable: false },
  { path: '/listening-mode', kind: 'app', indexable: false },
  { path: '/study-groups', kind: 'app', indexable: false },
  { path: '/weakness-analysis', kind: 'app', indexable: false },
  { path: '/sentence-rebuilder', kind: 'app', indexable: false },
  { path: '/rapid-fire', kind: 'app', indexable: false },
  { path: '/speed-speaking', kind: 'app', indexable: false },
  { path: '/friend-challenges', kind: 'app', indexable: false },
  { path: '/roadmap', kind: 'app', indexable: false },
  { path: '/fluency-heatmap', kind: 'app', indexable: false },
  { path: '/story-mode', kind: 'app', indexable: false },
  { path: '/scenario-architect', kind: 'app', indexable: false },
  { path: '/scenario-architect/session', kind: 'app', indexable: false },
  { path: '/word-drop', kind: 'app', indexable: false },
  { path: '/mastery', kind: 'app', indexable: false },
  { path: '/boss-battle', kind: 'app', indexable: false },
  { path: '/emoji-master', kind: 'app', indexable: false },
  { path: '/mystery-box', kind: 'app', indexable: false },
  { path: '/survival', kind: 'app', indexable: false },
  { path: '/pronunciation-lab', kind: 'app', indexable: false },
  { path: '/speaking-arena', kind: 'app', indexable: false },
  { path: '/challenges', kind: 'app', indexable: false },
  { path: '/daily-news', kind: 'app', indexable: false },
  { path: '/debug/beliefs', kind: 'dev-only', indexable: false },
  { path: '/admin', kind: 'app', indexable: false },
  { path: '/admin/questions', kind: 'app', indexable: false },
  { path: '/admin/questions/new', kind: 'app', indexable: false },
  { path: '/admin/scenarios', kind: 'app', indexable: false },
  { path: '/admin/scenarios/new', kind: 'app', indexable: false },

  { path: '/admin/questions/:id/edit', kind: 'dynamic', indexable: false },
  { path: '/admin/questions/:id/history', kind: 'dynamic', indexable: false },
  { path: '/admin/scenarios/:id/edit', kind: 'dynamic', indexable: false },
  { path: '/admin/scenarios/:id/history', kind: 'dynamic', indexable: false },
];
