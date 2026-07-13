import { useSyncExternalStore } from 'react';
import { STORAGE_KEYS, storageGet, storageSet, storageRemove } from '../services/persistence/storage';

type Listener = () => void;
const listeners = new Set<Listener>();
function emitChange() { listeners.forEach((l) => l()); }

export function isGuestMode(): boolean {
  return storageGet(STORAGE_KEYS.guestMode, false);
}

export function enterGuestMode(): void {
  storageSet(STORAGE_KEYS.guestMode, true);
  emitChange();
}

export function exitGuestMode(): void {
  storageRemove(STORAGE_KEYS.guestMode);
  emitChange();
}

function subscribe(callback: Listener): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.guestMode) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
}

export function useGuestMode() {
  const isGuest = useSyncExternalStore(subscribe, isGuestMode, () => false);
  return { isGuest, enterGuestMode, exitGuestMode };
}
