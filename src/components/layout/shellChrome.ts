import { createContext, useContext, useEffect } from 'react';

/**
 * Shell chrome state shared between MainLayout and the screens inside it.
 * Today it carries one flag: whether the mobile dock is hidden (a Learn
 * session takes the whole screen on mobile, as in the design's 2a frame).
 */
export interface ShellChromeValue {
  dockHidden: boolean;
  setDockHidden: (hidden: boolean) => void;
}

export const ShellChromeContext = createContext<ShellChromeValue>({ dockHidden: false, setDockHidden: () => {} });

export function useShellChrome(): ShellChromeValue {
  return useContext(ShellChromeContext);
}

/** Hide the mobile dock while `hidden` is true; restores it on unmount. */
export function useHideDock(hidden: boolean): void {
  const { setDockHidden } = useShellChrome();
  useEffect(() => {
    setDockHidden(hidden);
    return () => setDockHidden(false);
  }, [hidden, setDockHidden]);
}
