/**
 * "The learner just signed in" — a one-tab, short-lived marker that lets the
 * app say a proper welcome once, wherever the sign-in came from.
 *
 * A sign-in can finish in four places (the email form, Google's one-tap token,
 * the OAuth redirect and an emailed link), and the page may reload in between,
 * so the marker lives in `sessionStorage`: it survives a redirect inside the
 * tab, is gone when the tab closes, and never reaches another device. It is not
 * learner data — nothing reads it but `SignInWelcome` and the onboarding finish.
 *
 * Only an active sign-in sets it. A session restored from storage on app start
 * never does, so opening the app tomorrow is not a "welcome back" moment.
 */
const KEY = 'fc_freshSignIn';
/** A marker older than this was never consumed (the learner went elsewhere); it is ignored. */
export const FRESH_SIGN_IN_TTL_MS = 10 * 60 * 1000;

function store(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null; // blocked storage: no welcome, never an error
  }
}

export function markFreshSignIn(now: number = Date.now()): void {
  try {
    store()?.setItem(KEY, String(now));
  } catch {
    /* quota / private mode: the welcome is a nicety */
  }
}

/** True while an unexpired marker exists. Does not consume it (safe to call during render). */
export function hasFreshSignIn(now: number = Date.now()): boolean {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && now - at >= 0 && now - at < FRESH_SIGN_IN_TTL_MS;
  } catch {
    return false;
  }
}

export function clearFreshSignIn(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
