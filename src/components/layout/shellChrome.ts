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

/**
 * `ExamLayout` is immersive (no nav) except on the exam chooser. The chooser
 * calls `useShowNavRail(true)` to bring the side rail / dock back.
 */
export interface NavRailValue {
  setShowNavRail: (show: boolean) => void;
}

export const NavRailContext = createContext<NavRailValue>({ setShowNavRail: () => {} });

/** Show the nav rail while `show` is true; hides it again on unmount. */
export function useShowNavRail(show: boolean): void {
  const { setShowNavRail } = useContext(NavRailContext);
  useEffect(() => {
    setShowNavRail(show);
    return () => setShowNavRail(false);
  }, [show, setShowNavRail]);
}
