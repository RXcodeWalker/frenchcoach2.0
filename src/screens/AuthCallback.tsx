import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';

type CallbackState = 'processing' | 'error';

/**
 * Handles all three PKCE redirect flows uniformly — OAuth, signup
 * confirmation, and password recovery all land here with the same
 * `?code=` param, exchanged via the same exchangeCodeForSession call.
 * Recovery detection is race-free by construction: the onAuthStateChange
 * listener is registered before exchangeCodeForSession is called, both
 * owned within this effect's closure. See auth overhaul plan §3.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setErrorMessage('App is not configured.');
      setState('error');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    let recoveryDetected = params.get('type') === 'recovery'; // Signal A

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') recoveryDetected = true; // Signal B
    });

    (async () => {
      const oauthError = params.get('error_description') ?? params.get('error');
      if (oauthError) {
        subscription.unsubscribe();
        setErrorMessage(oauthError);
        setState('error');
        return;
      }

      const code = params.get('code');
      if (!code) {
        subscription.unsubscribe();
        setErrorMessage('No authorization code was present in the link.');
        setState('error');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      subscription.unsubscribe();
      if (error) {
        setErrorMessage(error.message);
        setState('error');
        return;
      }

      navigate(recoveryDetected ? '/reset-password' : '/', { replace: true });
    })();

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (state === 'error') {
    return (
      <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 bg-gradient-to-br from-slate-100 via-blue-50/30 to-violet-50/20 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl dark:bg-slate-900/60 bg-white/70 backdrop-blur-xl border dark:border-white/8 border-slate-200 shadow-2xl p-6">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <p className="font-semibold dark:text-white text-slate-900 text-sm">Sign-in link didn't work</p>
            <p className="text-xs dark:text-ink-muted text-ink-muted">{errorMessage}</p>
            <a href="/login" className="mt-2 text-xs text-violet-400 underline underline-offset-2">
              Back to login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-100 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
    </div>
  );
}
