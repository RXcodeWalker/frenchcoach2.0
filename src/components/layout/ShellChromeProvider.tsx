import { useState, type ReactNode } from 'react';
import { ShellChromeContext } from './shellChrome';

export function ShellChromeProvider({ children }: { children: ReactNode }) {
  const [dockHidden, setDockHidden] = useState(false);
  return <ShellChromeContext.Provider value={{ dockHidden, setDockHidden }}>{children}</ShellChromeContext.Provider>;
}
