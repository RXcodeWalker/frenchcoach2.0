import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Primary + quiet actions, laid out by the caller. */
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog (Component Kit §10). 480px wide, a full-width sheet under
 * 640px; --surface-raised with --shadow-overlay, 24px padding; the backdrop
 * is a --scrim dim, not a blur. Serif title. Escape and a backdrop click both
 * close; focus is trapped inside and returns to the trigger on close.
 *
 * A celebration is this same dialog plus one entrance and one count-up — it is
 * not a separate component.
 */
export function Modal({ open, onClose, title, children, footer }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    if (firstFocusable) firstFocusable.focus();
    else panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      {/* Scrim — a dim, not a blur */}
      <div
        className="absolute inset-0"
        style={{ background: 'var(--scrim)' }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative w-full max-w-[480px] rounded-card surface-raised p-6
          animate-fade-in max-sm:max-w-none max-sm:self-end max-sm:rounded-b-none"
      >
        {title != null && (
          <div className="font-display text-[30px] leading-tight text-ink">{title}</div>
        )}
        <div className={title != null ? 'mt-3' : undefined}>{children}</div>
        {footer != null && <div className="mt-5 flex items-center gap-2">{footer}</div>}
      </div>
    </div>
  );
}
