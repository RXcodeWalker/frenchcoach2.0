/**
 * The `route` analytics property: the pathname only (never the query string or
 * hash — auth links carry tokens there), with id segments collapsed so
 * /junior/animals and /duel/9f3c… read as /junior/:id and /duel/:id.
 */
const PARAM_PARENTS = new Set(['junior', 'duel', 'scenario', 'questions', 'scenarios']);
const STATIC_CHILDREN = new Set(['new', 'edit', 'history', 'session', 'placement']);

export function normaliseRoute(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const out = segments.map((segment, i) => {
    const parent = segments[i - 1];
    if (parent && PARAM_PARENTS.has(parent) && !STATIC_CHILDREN.has(segment)) return ':id';
    // Anything id-shaped elsewhere (a uuid, a long token with digits).
    if (/^[0-9a-f-]{16,}$/i.test(segment) || (segment.length > 24 && /\d/.test(segment))) return ':id';
    return segment;
  });
  return `/${out.join('/')}`.slice(0, 64);
}

/** The current route, for code without router access (a notice, a gate). */
export function currentRoute(): string {
  return typeof window === 'undefined' ? '/' : normaliseRoute(window.location.pathname);
}
