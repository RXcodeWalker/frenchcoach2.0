import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listSavedAnswers, subscribeSavedAnswers, type SavedAnswer } from '../../../services/offline/savedAnswers';

/** The account scope saved answers are kept under. */
export function useSavedAnswerScope(): string {
  const { user } = useAuth();
  return user?.id ?? 'guest';
}

/** This account's saved answers (oldest first), re-read whenever the store changes. */
export function useSavedAnswers(): { items: SavedAnswer[]; loaded: boolean } {
  const scope = useSavedAnswerScope();
  const [state, setState] = useState<{ items: SavedAnswer[]; loaded: boolean }>({ items: [], loaded: false });
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void listSavedAnswers(scope).then((items) => {
        if (!cancelled) setState({ items, loaded: true });
      });
    };
    load();
    const unsubscribe = subscribeSavedAnswers(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [scope]);
  return state;
}
