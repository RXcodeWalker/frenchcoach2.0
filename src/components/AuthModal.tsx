import { X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthForm } from './auth/AuthForm';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface Props {
  onClose: () => void;
}

export function AuthModal({ onClose }: Props) {
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    onClose();
  }

  return (
    <Modal open onClose={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-control text-ink-muted transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
      >
        <X size={18} aria-hidden="true" />
      </button>

      {user ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div>
            <p className="text-label font-normal text-ink-subtle">Signed in as</p>
            <p className="mt-0.5 break-all text-section text-ink">{user.email}</p>
            <p className="mt-1 text-label text-progress-text">Progress syncing to cloud</p>
          </div>
          <Button variant="destructive" onClick={handleSignOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="pr-8">
            <h2 className="text-title text-ink">Sync your progress</h2>
            <p className="mt-1 text-body-s text-ink-muted">
              Sign in to back up XP, achievements and gems across devices.
            </p>
          </div>
          <AuthForm onAuthenticated={onClose} />
        </div>
      )}
    </Modal>
  );
}
