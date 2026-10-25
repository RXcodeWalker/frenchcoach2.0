import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { TourStep } from './tourSteps';

export type TourEndReason = 'finished' | 'skipped' | 'cta';

interface Props {
  steps: TourStep[];
  onEnd: (reason: TourEndReason) => void;
  /** Label for the last step's primary button; it ends the tour with 'cta'. */
  ctaLabel: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GUTTER = 16; // min distance from the viewport edge
const GAP = 14; // card ↔ spotlight
const PAD = 6; // spotlight padding around the anchor
const CARD_MAX = 360;

/** Visible keyboard focus — Button has no focus style of its own. */
const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The union rect of every *visible* element carrying one of `anchors` as its
 * `data-tour` value. The desktop rail and the mobile dock both carry the same
 * names, and the hidden one measures 0×0, so the right copy wins at any width.
 */
function measureAnchors(anchors: string[] | undefined): Rect | null {
  if (!anchors?.length) return null;
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const name of anchors) {
    document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    });
  }
  if (!Number.isFinite(top)) return null;
  return { top: top - PAD, left: left - PAD, width: right - left + PAD * 2, height: bottom - top + PAD * 2 };
}

type Placement =
  | { kind: 'center' }
  | { kind: 'side'; cardStyle: CSSProperties; caret: CSSProperties; caretSide: 'left' | 'bottom' | 'top' };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Right of the anchor when there is room (the desktop side rail), otherwise
 * above it (the mobile bottom dock), otherwise below. The caret points at the
 * anchor's centre, clamped to stay on the card's rounded edge.
 */
function place(anchor: Rect | null, cardW: number, cardH: number): Placement {
  if (!anchor) return { kind: 'center' };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = anchor.left + anchor.width / 2;
  const cy = anchor.top + anchor.height / 2;

  if (anchor.left + anchor.width + GAP + cardW <= vw - GUTTER) {
    const left = anchor.left + anchor.width + GAP;
    const top = clamp(cy - cardH / 2, GUTTER, Math.max(GUTTER, vh - cardH - GUTTER));
    return {
      kind: 'side',
      cardStyle: { left, top, width: cardW },
      caret: { left: -6, top: clamp(cy - top - 6, 20, cardH - 32) },
      caretSide: 'left',
    };
  }

  const left = clamp(cx - cardW / 2, GUTTER, vw - cardW - GUTTER);
  const caretLeft = clamp(cx - left - 6, 24, cardW - 36);
  if (anchor.top - GAP - cardH >= GUTTER || anchor.top > vh - anchor.top - anchor.height) {
    return {
      kind: 'side',
      cardStyle: { left, bottom: vh - anchor.top + GAP, width: cardW },
      caret: { left: caretLeft, bottom: -6 },
      caretSide: 'bottom',
    };
  }
  return {
    kind: 'side',
    cardStyle: { left, top: anchor.top + anchor.height + GAP, width: cardW },
    caret: { left: caretLeft, top: -6 },
    caretSide: 'top',
  };
}

/**
 * Coach-mark tour: a spotlight cut out of a scrim around the real nav item,
 * plus a card beside it. Steps without a visible anchor show a centred card.
 * Rendered in a portal so no transformed ancestor (MainLayout's page
 * transition) can break `position: fixed`.
 *
 * Accessibility: role="dialog" + aria-modal, labelled by the step title and
 * described by its body (re-announced via aria-live on each step), focus
 * trapped and returned to the trigger on close; Escape skips, ←/→ move.
 */
export function GuidedTour({ steps, onEnd, ctaLabel }: Props) {
  const [index, setIndex] = useState(0);
  const [anchor, setAnchor] = useState<Rect | null>(() => measureAnchors(steps[0].anchors));
  const [cardH, setCardH] = useState(220);
  const [vw, setVw] = useState(() => window.innerWidth);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const cardW = Math.min(CARD_MAX, vw - GUTTER * 2);

  const remeasure = useCallback(() => {
    setVw(window.innerWidth);
    setAnchor(measureAnchors(step.anchors));
    if (panelRef.current) setCardH(panelRef.current.offsetHeight);
  }, [step.anchors]);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure, index]);

  useEffect(() => {
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [remeasure]);

  // Remember what had focus so it gets it back when the tour closes.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    return () => {
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  // Each step lands focus on its primary action, so Enter keeps moving forward.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[data-tour-primary]')?.focus();
  }, [index]);

  const next = useCallback(() => {
    if (isLast) onEnd('finished');
    else setIndex((i) => i + 1);
  }, [isLast, onEnd]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEnd('skipped');
        return;
      }
      if (e.key === 'ArrowRight' && !isLast) {
        e.preventDefault();
        next();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
        return;
      }
      const panel = panelRef.current;
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [next, back, onEnd, isLast]);

  const placement = place(anchor, cardW, cardH);
  const glide = reduceMotion ? 'none' : 'top 320ms var(--ease), left 320ms var(--ease), width 320ms var(--ease), height 320ms var(--ease)';
  const titleId = `tour-title-${step.id}`;
  const bodyId = `tour-body-${step.id}`;

  const card = (
    <motion.div
      key={reduceMotion ? 'card' : step.id}
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-testid="guided-tour"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`${placement.kind === 'side' ? 'fixed' : 'relative w-full'} rounded-card surface-raised shadow-overlay border border-hairline p-5 text-ink`}
      style={placement.kind === 'side' ? placement.cardStyle : { maxWidth: cardW }}
    >
      {placement.kind === 'side' && (
        <span
          aria-hidden="true"
          className={`absolute w-3 h-3 rotate-45 surface-raised border-hairline
            ${placement.caretSide === 'left' ? 'border-l border-b' : placement.caretSide === 'bottom' ? 'border-r border-b' : 'border-l border-t'}`}
          style={placement.caret}
        />
      )}

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-label text-ink-muted tabular-nums" aria-label={`Step ${index + 1} of ${steps.length}`}>
            {index + 1} of {steps.length}
          </span>
          <span className="flex items-center gap-1" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-pill ${i === index ? 'w-4 bg-action' : i < index ? 'w-1.5 bg-action-text' : 'w-1.5 bg-track'}`}
                style={{ transition: reduceMotion ? 'none' : 'width 200ms var(--ease)' }}
              />
            ))}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onEnd('skipped')}
          className={`-mr-2 inline-flex items-center gap-1 min-h-[44px] px-2 rounded-control text-label text-ink-muted hover:text-ink transition-colors duration-state ${RING}`}
        >
          Skip tour
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div aria-live="polite">
        <h2 id={titleId} className="font-display text-[26px] leading-tight text-ink">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-2 text-body-base text-ink-muted">
          {step.body}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2">
        {isLast ? (
          <>
            <Button data-tour-primary size="lg" className={`flex-1 ${RING}`} onClick={() => onEnd('cta')}>
              {ctaLabel}
            </Button>
            <Button variant="quiet" size="lg" className={RING} onClick={() => onEnd('finished')}>
              Maybe later
            </Button>
          </>
        ) : (
          <>
            {!isFirst && (
              <Button variant="secondary" size="lg" className={RING} onClick={back}>
                Back
              </Button>
            )}
            <Button data-tour-primary size="lg" className={`flex-1 ${RING}`} onClick={next}>
              {isFirst ? 'Show me around' : 'Next'}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[150]" data-hatch="tour">
      {anchor ? (
        // The spotlight: a rounded box whose huge spread shadow is the scrim.
        <div
          aria-hidden="true"
          className="fixed rounded-card pointer-events-none"
          style={{
            top: anchor.top,
            left: anchor.left,
            width: anchor.width,
            height: anchor.height,
            boxShadow: '0 0 0 2px var(--action), 0 0 0 9999px var(--scrim)',
            transition: glide,
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0" style={{ background: 'var(--scrim)' }} />
      )}
      {/* One wrapper in both modes, so switching between a centred and an
          anchored step never remounts the card (that would drop focus). */}
      <div className={placement.kind === 'center' ? 'fixed inset-0 flex items-center justify-center p-4' : 'contents'}>
        {card}
      </div>
    </div>,
    document.body,
  );
}
