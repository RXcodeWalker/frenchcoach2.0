import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../../services/persistence/storage';

export type ExamVoice = 'paper' | 'app';

const KEY = STORAGE_KEYS.examVoice;

function read(): ExamVoice {
  try {
    return localStorage.getItem(KEY) === 'app' ? 'app' : 'paper';
  } catch {
    return 'paper';
  }
}

/**
 * The learner's choice of exam presentation: the warm-paper "exam voice"
 * (default, matches the design screens) or the core app token theme. Persisted
 * to localStorage; the toggle lives in the exam mode chrome.
 */
export function useExamVoice(): [ExamVoice, () => void] {
  const [voice, setVoice] = useState<ExamVoice>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setVoice(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setVoice((v) => {
      const next: ExamVoice = v === 'paper' ? 'app' : 'paper';
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // non-critical — the choice just won't persist
      }
      return next;
    });
  }, []);

  return [voice, toggle];
}
