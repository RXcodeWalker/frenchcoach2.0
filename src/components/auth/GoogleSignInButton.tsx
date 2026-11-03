import { useEffect, useRef, useState } from 'react';

/**
 * Google's own "Sign in with Google" button (Google Identity Services).
 *
 * The sign-in runs on our domain, not on the Supabase project URL, so Google's
 * account picker says "to continue to french.beyondthebasics.me" instead of
 * "<project>.supabase.co". Google returns an ID token, which the caller hands to
 * `supabase.auth.signInWithIdToken` together with the raw nonce.
 *
 * The client ID is public (it is in every page that shows the button); the env
 * var overrides it. The origin must be listed under the OAuth client's
 * "Authorized JavaScript origins" in Google Cloud.
 */
const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
  '492811072842-6bbaughv8lbm0kkdlp82sbd5qr009kn3.apps.googleusercontent.com';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (res: { credential?: string }) => void;
    nonce?: string;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: 'popup' | 'redirect';
  }): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

let scriptPromise: Promise<GoogleIdApi> | null = null;

function loadGis(): Promise<GoogleIdApi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error('Google sign-in did not load.'));
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google sign-in did not load.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  /** Called with Google's ID token and the raw (unhashed) nonce Google was given the hash of. */
  onCredential: (idToken: string, nonce: string) => void;
  /** Called when Google's script cannot load, so the caller can show its fallback button. */
  onUnavailable: () => void;
  text: 'signin_with' | 'signup_with' | 'continue_with';
}

export function GoogleSignInButton({ onCredential, onUnavailable, text }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    // Google's button takes a fixed pixel width (max 400).
    setWidth(Math.min(400, Math.max(200, Math.floor(el.getBoundingClientRect().width))));
  }, []);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    (async () => {
      try {
        const api = await loadGis();
        const nonce = randomNonce();
        const hashed = await sha256Hex(nonce);
        if (cancelled || !hostRef.current) return;
        api.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashed,
          ux_mode: 'popup',
          callback: res => {
            if (res.credential) callbackRef.current(res.credential, nonce);
          },
        });
        hostRef.current.innerHTML = '';
        api.renderButton(hostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          logo_alignment: 'center',
          width,
        });
      } catch {
        if (!cancelled) onUnavailable();
      }
    })();
    return () => { cancelled = true; };
  }, [width, text, onUnavailable]);

  return (
    <div
      ref={hostRef}
      className="flex min-h-[44px] w-full justify-center"
      data-testid="google-signin"
    />
  );
}
