import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthShell } from '../components/auth/AuthShell';
import { TextField } from '../components/auth/TextField';
import { InlineAlert } from '../components/auth/InlineAlert';
import { Button } from '../components/ui/Button';

// Only reachable via AuthCallback's post-recovery redirect, so a valid
// recovery session already exists — no re-login needed after updateUser.
export function ResetPassword() {
  const { updateUserPassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updateUserPassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="New password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="flex h-9 w-9 items-center justify-center rounded-control text-ink-muted transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          }
        />
        <TextField
          label="Confirm new password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          error={confirmPassword && confirmPassword !== password ? 'Passwords do not match.' : null}
        />
        {error && <InlineAlert>{error}</InlineAlert>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
