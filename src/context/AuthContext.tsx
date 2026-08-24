import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  configError: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
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

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const isAdmin =
    (user?.app_metadata as { role?: string } | undefined)?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, configError: false, signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
