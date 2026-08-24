# OAuth (Step 4 of auth overhaul) — verification status

**Status: code implemented, NOT verified. Do not treat as shipped to real users.**

`signInWithOAuth` (`src/context/AuthContext.tsx`) and the Google/Microsoft buttons
(`src/screens/Auth.tsx`) are implemented per the auth overhaul plan §3/§9/§10, but the
plan's own exit criterion for this step is a **hard blocker** that has not been run:

## Outstanding before this can ship to real users

1. **External app registrations** (don't exist yet, not in this repo):
   - Google Cloud OAuth consent screen + Web application Client ID.
   - Microsoft/Azure App registration.
   - Both registered as providers in the Supabase dashboard with real credentials.
2. **Five-case identity-linking verification gate** (plan §4/§11), run against a
   **non-production** Supabase project:
   1. Password signup (confirmed) → later Google sign-in, same email → same `profiles` row.
   2. Password signup (confirmed) → later Microsoft sign-in, same email → same as above.
   3. Google sign-in → later Microsoft sign-in, same email → merges into one account.
   4. Password signup **without** confirming email → OAuth sign-in, same email → must
      NOT silently merge into the unconfirmed account.
   5. A user with two already-linked identities → signs in again with either provider →
      resolves to the existing account, no duplicate/third identity.
3. **Real-browser manual round-trips** for both providers against real consent screens
   (cannot be meaningfully unit-tested).

## What's already done and verified

- `signInWithOAuth(provider)` added to `AuthContext`, builds `redirectTo` from
  `window.location.origin` (consistent with the existing password-reset flow),
  matching plan §2/§3.
- Buttons wired into `Auth.tsx` with accessible labels ("Continue with Google" /
  "Continue with Microsoft", not icon-only) per plan §10, reusing the existing
  error-banner pattern.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass.

## Next session should

- Not mark plan Step 4 "done" or proceed to Step 5 (unifying the two sign-in UIs) as
  if OAuth is production-ready until this file is updated to reflect the gate above
  actually passing.
- Delete or update this file once the five-case gate has been run and passed on a
  non-production Supabase project.
