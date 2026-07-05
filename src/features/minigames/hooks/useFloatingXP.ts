import { useState, useRef, useEffect, useCallback } from 'react';

export interface FloatingXPItem {
  id: number;
  amount: number;
  x: number;
  y: number;
  text?: string;
  type?: 'xp' | 'time' | 'combo';
  label?: string;
}

export interface UseFloatingXPOptions {
  removeAfterMs?: number;
}

export interface FloatingXPState {
  items: FloatingXPItem[];
  add: (item: Omit<FloatingXPItem, 'id' | 'y'> & { id?: number; y?: number }) => void;
  remove: (id: number) => void;
  clear: () => void;
}

export function useFloatingXP({
  removeAfterMs = 1000,
}: UseFloatingXPOptions = {}): FloatingXPState {
  const [items, setItems] = useState<FloatingXPItem[]>([]);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const add = useCallback(
    (item: Omit<FloatingXPItem, 'id' | 'y'> & { id?: number; y?: number }) => {
      const id = item.id ?? Date.now() + Math.random();
      const entry: FloatingXPItem = {
        ...item,
        id,
        x: item.x,
        y: item.y ?? 0,
      };
      setItems((prev) => [...prev, entry]);
      const timeout = setTimeout(() => remove(id), removeAfterMs);
      timeoutsRef.current.set(id, timeout);
    },
    [remove, removeAfterMs]
  );

  const clear = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setItems([]);
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  return { items, add, remove, clear };
}
