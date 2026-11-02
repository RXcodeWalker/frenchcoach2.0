import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, MailCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { track } from '../../services/telemetry/telemetryService';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { TextField } from './TextField';
import { InlineAlert } from './InlineAlert';

interface Props {
  onAuthenticated: () => void;
  footer?: React.ReactNode;
  /** The full-page sign-in shows a heading that follows the tab and a terms line; the popup does not. */
  page?: boolean;
}

export function AuthForm({ onAuthenticated, footer, page = false }: Props) {
  const reduced = useReducedMotion();
  const { signIn, signUp, resetPasswordForEmail, signInWithOAuth, configError } = useAuth();

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (tab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (tab === 'signup') track({ name: 'signup_started', props: { method: 'email' } });
    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
        onAuthenticated();
      } else {
        const result = await signUp(email, password);
        if (result.needsConfirmation) {
          setNeedsConfirmation(true);
        } else {
          onAuthenticated();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google') {
    setError(null);
    // Sent now: the OAuth redirect unloads the page. signed_up / signed_in follow from AnalyticsTracker.
    if (tab === 'signup') track({ name: 'signup_started', props: { method: provider } }, { beacon: true });
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetLoading(true);
    try {
      await resetPasswordForEmail(email);
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setResetLoading(false);
    }
  }

  if (configError) {
    return (
      <Notice
        tone="error"
        icon={<AlertCircle size={20} aria-hidden="true" />}
        title="App not configured"
      >
        Supabase environment variables are missing. Contact the developer.
      </Notice>
    );
  }

  if (needsConfirmation) {
    return (
      <Notice
        tone="success"
        icon={<MailCheck size={20} aria-hidden="true" />}
        title="Check your inbox"
        action={
          <Button variant="quiet" size="sm" onClick={() => setNeedsConfirmation(false)}>
            Back to login
          </Button>
        }
      >
        We sent a confirmation link to <strong className="font-semibold text-ink">{email}</strong>. Open it to activate your account.
      </Notice>
    );
  }

  if (forgotPassword) {
    if (resetSent) {
      return (
        <Notice
          tone="success"
          icon={<MailCheck size={20} aria-hidden="true" />}
          title="Check your inbox"
          action={
            <Button variant="quiet" size="sm" onClick={() => { setForgotPassword(false); setResetSent(false); }}>
              Back to login
            </Button>
          }
        >
          We sent a password reset link to <strong className="font-semibold text-ink">{email}</strong>.
        </Notice>
      );
    }

    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div>
          <h2 className="text-section text-ink">Reset your password</h2>
          <p className="mt-1 text-body-s text-ink-muted">
            Enter your email and we'll send you a link to reset it.
          </p>
        </div>
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {error && <InlineAlert>{error}</InlineAlert>}
        <Button type="submit" size="lg" className="w-full" loading={resetLoading}>
          Send reset link
        </Button>
        <Button
          variant="quiet"
          className="w-full"
          onClick={() => { setForgotPassword(false); setError(null); }}
        >
          Back to login
        </Button>
      </form>
    );
  }

  const isLogin = tab === 'login';
  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(s => !s)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      aria-pressed={showPassword}
      className="flex h-9 w-9 items-center justify-center rounded-control text-ink-muted transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
    >
      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );
  const fade = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.24, ease: [0.2, 0, 0.2, 1] as const } };

  return (
    <>
      {page && (
        <div className="mb-6">
          <h1 className="text-title text-ink sm:text-h2">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-2 text-body-base text-ink-muted">
            {isLogin ? 'Log in to pick up where you left off.' : 'Free to start. Your progress is saved to your account.'}
          </p>
        </div>
      )}

      <Segmented
        label="Log in or sign up"
        value={tab}
        onChange={t => { setTab(t); setError(null); }}
        options={[
          { id: 'login', label: 'Log In' },
          { id: 'signup', label: 'Sign Up' },
        ]}
        height={40}
        className="mb-5"
      />

      <div className="space-y-2">
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => handleOAuth('google')}
          aria-label="Continue with Google"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3" role="separator" aria-label="or use email">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-caption text-ink-subtle">or use email</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus={page && typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches}
        />

        <div>
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            trailing={passwordToggle}
            hint={isLogin ? undefined : 'Use 8 or more characters.'}
          />
          {isLogin && (
            <button
              type="button"
              onClick={() => { setForgotPassword(true); setError(null); }}
              className="mt-2 rounded-control text-label text-action-text underline underline-offset-2 hover:text-action-hover"
            >
              Forgot password?
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!isLogin && (
            <motion.div key="confirm" {...fade} style={{ overflow: 'hidden', marginTop: 0 }}>
              <div className="pt-4">
              <TextField
                label="Confirm password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                error={confirmPassword && confirmPassword !== password ? 'Passwords do not match.' : null}
              />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div key="err" {...fade} style={{ overflow: 'hidden' }}>
              <InlineAlert>{error}</InlineAlert>
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {isLogin ? 'Log In' : 'Create Account'}
        </Button>

        {page && !isLogin && (
          <p className="text-center text-caption text-ink-subtle">
            By creating an account you agree to the{' '}
            <a href="/terms" className="text-action-text underline underline-offset-2">Terms</a> and{' '}
            <a href="/privacy" className="text-action-text underline underline-offset-2">Privacy Policy</a>.
          </p>
        )}
      </form>

      {footer}
    </>
  );
}

/** A finished state (confirmation sent, app not configured): icon, title, one line, one quiet action. */
function Notice({
  tone,
  icon,
  title,
  action,
  children,
}: {
  tone: 'error' | 'success';
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-2 text-center" role={tone === 'error' ? 'alert' : 'status'}>
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-card ${
          tone === 'error' ? 'bg-correction-soft text-correction-text' : 'bg-progress-soft text-progress-text'
        }`}
      >
        {icon}
      </span>
      <p className="mt-1 text-section text-ink">{title}</p>
      <p className="text-body-s text-ink-muted">{children}</p>
      {action}
    </div>
  );
}
