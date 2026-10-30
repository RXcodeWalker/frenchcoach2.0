import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import {
  CHORD_PREFIX,
  CHORD_TIMEOUT_MS,
  SHORTCUT_GROUPS,
  SHORTCUT_HELP_EVENT,
  hasCommandModifier,
  isDialogOpen,
  isInteractiveTarget,
  isTypingTarget,
  navShortcutFor,
  runBackHandlers,
  setChordPending,
} from '../lib/keyboardShortcuts';

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-[24px] items-center justify-center rounded-control border border-hairline bg-surface-recessed px-1.5 py-0.5 font-numeral text-[13px] text-ink">
      {children}
    </kbd>
  );
}

/**
 * App-wide shortcuts, mounted once in MainLayout (not in the exam, where a
 * stray key must never leave a running attempt). `g` then a letter navigates;
 * `?` lists them. Everything stands down while the learner is typing, while a
 * dialog is open, and for Ctrl/Cmd/Alt chords.
 */
export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const [helpOpen, setHelpOpen] = useState(false);
  const chordTimer = useRef<number | null>(null);
  const awaitingSecond = useRef(false);

  const clearChord = useCallback(() => {
    awaitingSecond.current = false;
    setChordPending(false);
    if (chordTimer.current !== null) {
      window.clearTimeout(chordTimer.current);
      chordTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || hasCommandModifier(e)) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === '?') {
        // The help dialog's own `?` closes it; any other dialog keeps the page quiet.
        if (isDialogOpen() && !helpOpen) return;
        e.preventDefault();
        clearChord();
        setHelpOpen(open => !open);
        return;
      }
      if (isDialogOpen()) {
        clearChord();
        return;
      }

      if (e.key === 'Escape') {
        clearChord();
        if (runBackHandlers()) {
          e.preventDefault();
          return;
        }
        // react-router's history state counts entries in this tab: idx 0 is the first page.
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) {
          e.preventDefault();
          navigate(-1);
        } else if (pathRef.current !== '/') {
          e.preventDefault();
          navigate('/');
        }
        return;
      }

      // Shift + letter is the one-press form of the g chord (typing is already excluded above).
      if (e.shiftKey && !awaitingSecond.current && e.key.length === 1) {
        const target = navShortcutFor(e.key);
        if (target) {
          e.preventDefault();
          navigate(target.path);
          return;
        }
      }

      if (awaitingSecond.current) {
        const target = navShortcutFor(e.key);
        clearChord();
        if (target) {
          e.preventDefault();
          navigate(target.path);
        }
        return;
      }

      if (e.key.toLowerCase() === CHORD_PREFIX && !e.shiftKey && !isInteractiveTarget(e.target)) {
        awaitingSecond.current = true;
        setChordPending(true);
        chordTimer.current = window.setTimeout(clearChord, CHORD_TIMEOUT_MS);
      }
    };
    const onHelpRequest = () => setHelpOpen(true);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(SHORTCUT_HELP_EVENT, onHelpRequest);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(SHORTCUT_HELP_EVENT, onHelpRequest);
      clearChord();
    };
  }, [navigate, helpOpen, clearChord]);

  const close = useCallback(() => setHelpOpen(false), []);

  return (
    <Modal open={helpOpen} onClose={close} title="Keyboard shortcuts">
      <div className="flex flex-col gap-5">
        {SHORTCUT_GROUPS.map(group => (
          <section key={group.title} aria-label={group.title}>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">{group.title}</h3>
            <ul className="flex flex-col gap-2">
              {group.items.map(item => (
                <li key={item.label} className="flex items-center justify-between gap-4 text-[15px] text-ink">
                  <span>{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && item.join !== '+' && <span className="text-[12px] text-ink-subtle">{item.join === 'or' ? 'or' : 'then'}</span>}
                        {i > 0 && item.join === '+' && <span className="text-[12px] text-ink-subtle">+</span>}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
