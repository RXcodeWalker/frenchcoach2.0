import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

// Phase 1.6 Part C. 'unknown' means "not fetched yet" (or offline/guest) —
// distinct from '13_plus_not_required' so AgeBandCheck can tell "still
// loading, don't redirect yet" from "confirmed, no guardian step needed".
export type AgeBand = 'under_13' | '13_plus' | null;
export type ConsentStatus = '13_plus_not_required' | 'pending' | 'granted' | 'revoked' | 'unknown';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  configError: boolean;
  /** null once loaded for a user who has never set one (pre-Phase-1.6 account). */
  ageBand: AgeBand;
  consentStatus: ConsentStatus;
  /** Re-reads age_band/consent_status from profiles — call after an RPC changes either. */
  refreshConsentStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'azure') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function translateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('User already registered')) {
    return 'An account with this email already exists. Try logging in.';
  }
  if (msg.includes('Password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('over_email_send_rate_limit') || msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
    return 'Connection failed. Check your internet and try again.';
  }
  console.error('[AuthContext] Unexpected error:', err);
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ageBand, setAgeBand] = useState<AgeBand>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('unknown');

  async function loadConsentStatus(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('age_band, consent_status')
      .eq('id', userId)
      .single();
    if (error || !data) {
      // A missing/unreadable row reads as "not required" rather than staying
      // 'unknown' forever — AgeBandCheck would otherwise never redirect a
      // user whose profile row genuinely has no age_band yet (new signup
      // whose profile insert hasn't landed) into the age-band step.
      setAgeBand(null);
      setConsentStatus('unknown');
      return;
    }
    setAgeBand((data.age_band as AgeBand) ?? null);
    setConsentStatus((data.consent_status as ConsentStatus) ?? '13_plus_not_required');
  }

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) void loadConsentStatus(data.session.user.id);
    }).catch(err => {
      // A rejected getSession() must not leave loading stuck true forever
      // (reliability plan §2.5) — treat it as "no session" rather than hang.
      console.error(err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        void loadConsentStatus(newSession.user.id);
      } else {
        setAgeBand(null);
        setConsentStatus('unknown');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function refreshConsentStatus() {
    if (user) await loadConsentStatus(user.id);
  }

  async function signIn(email: string, password: string) {
    if (!supabaseConfigured) throw new Error('App is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateError(error));
  }

  async function signUp(email: string, password: string) {
    if (!supabaseConfigured) throw new Error('App is not configured.');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(translateError(error));
    return { needsConfirmation: Boolean(data.user && !data.session) };
  }

  async function signOut() {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
  }

  async function resetPasswordForEmail(email: string) {
    if (!supabaseConfigured) throw new Error('App is not configured.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) throw new Error(translateError(error));
  }

  async function updateUserPassword(newPassword: string) {
    if (!supabaseConfigured) throw new Error('App is not configured.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(translateError(error));
  }

  async function signInWithOAuth(provider: 'google' | 'azure') {
    if (!supabaseConfigured) throw new Error('App is not configured.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(translateError(error));
  }

  const isAdmin =
    (user?.app_metadata as { role?: string } | undefined)?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, configError: false, ageBand, consentStatus, refreshConsentStatus, signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword, signInWithOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
