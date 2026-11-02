import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGuestMode } from '../hooks/useGuestMode';
import { AuthForm } from '../components/auth/AuthForm';
import { AuthSplit } from '../components/auth/AuthSplit';
import { Button } from '../components/ui/Button';

export function Auth() {
  const { isGuest, enterGuestMode, exitGuestMode } = useGuestMode();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { redirect?: string } | null)?.redirect ?? '/';
  const isGuestConversion = isGuest && location.pathname === '/login';

  function handleAuthenticated() {
    exitGuestMode();
    navigate(redirectTo, { replace: true });
  }

  function handleGuest() {
    enterGuestMode();
    navigate(redirectTo, { replace: true });
  }

  function handleCancelConversion() {
    navigate('/', { replace: true });
  }

  return (
    <AuthSplit
      below={
        !isGuestConversion && (
          <p className="text-caption text-ink-subtle">
            Guest data stays on this device only — it isn't backed up, and clearing your browser storage will erase it.
          </p>
        )
      }
    >
      {isGuestConversion && (
        <Button variant="quiet" size="sm" className="-ml-2 mb-4" onClick={handleCancelConversion}>
          <ArrowLeft size={16} aria-hidden="true" /> Cancel — back to your guest session
        </Button>
      )}

      <AuthForm
        page
        onAuthenticated={handleAuthenticated}
        footer={
          !isGuestConversion && (
            <Button variant="quiet" className="mt-3 w-full" onClick={handleGuest}>
              Continue as Guest
            </Button>
          )
        }
      />
    </AuthSplit>
  );
}
