/**
 * Keyboard shortcuts: the table the help overlay shows and the matcher the
 * global handler uses. Pure — no React, no DOM beyond the event target.
 *
 * Navigation is a two-key chord (`g` then a letter, as in Gmail/GitHub) so a
 * single stray key never leaves the page. Only launch-scope destinations are
 * listed (src/config/launchScope.ts) — never add a path that is hidden there.
 */

export interface NavShortcut {
  /** The key pressed after `g`. */
  key: string;
  path: string;
  label: string;
}

export const NAV_SHORTCUTS: readonly NavShortcut[] = [
  { key: 'h', path: '/', label: 'Go to Home' },
  { key: 'l', path: '/learn', label: 'Go to Learn' },
  { key: 'e', path: '/exam', label: 'Go to Exam' },
  { key: 'x', path: '/explore', label: 'Go to Explore' },
  { key: 'p', path: '/progress', label: 'Go to Progress' },
  { key: 'n', path: '/notebook', label: 'Go to Notebook' },
  { key: 'u', path: '/profile', label: 'Go to Profile' },
];

export const CHORD_PREFIX = 'g';
/** How long `g` waits for its second key. */
export const CHORD_TIMEOUT_MS = 1200;

export interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string; /** How the keys combine: a sequence ("then", the default) or alternatives ("or"). */ join?: 'then' | 'or' | '+' }[];
}

/** What the `?` overlay lists. */
export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Move around',
    items: [
      ...NAV_SHORTCUTS.map(s => ({ keys: [CHORD_PREFIX, s.key], label: s.label })),
      { keys: ['Shift', 'letter'], label: 'Same as g then the letter (Shift + L for Learn)', join: '+' as const },
      { keys: ['Esc'], label: 'Go back (to the topics from a topic, otherwise the previous page; asks first mid-session)' },
    ],
  },
  {
    title: 'Learn',
    items: [
      { keys: ['Space'], label: 'Start or stop recording your answer' },
      { keys: ['h'], label: 'Show or hide the hint' },
      { keys: ['s'], label: 'Skip this question' },
      { keys: ['n'], label: 'Next question, once you have your feedback' },
    ],
  },
  {
    title: 'Emoji Master',
    items: [
      { keys: ['1', '4'], label: 'Pick the matching answer in Classic and Reverse', join: 'or' as const },
      { keys: ['Enter'], label: 'Submit a typed answer, or go on after a miss' },
    ],
  },
  {
    title: 'Anywhere',
    items: [
      { keys: ['?'], label: 'Show or hide this list' },
      { keys: ['Esc'], label: 'Close a dialog' },
    ],
  },
];

const INTERACTIVE = 'a[href],button,input,textarea,select,summary,[contenteditable=""],[contenteditable="true"],[role="button"],[role="tab"],[role="menuitem"],[role="switch"],[role="checkbox"],[role="radio"],[role="link"]';

/** A field the learner is typing into: shortcut letters must reach it untouched. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('textarea,select,[contenteditable=""],[contenteditable="true"]')) return true;
  const input = target.closest('input');
  if (!input) return false;
  const type = (input.getAttribute('type') ?? 'text').toLowerCase();
  return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'file', 'image', 'color'].includes(type);
}

/** Anything that already acts on Space/Enter itself (a button, link, tab, …). */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) !== null;
}

/** A modal dialog is open (our Modal, the tour, the delete confirmation): the page behind it stays quiet. */
export function isDialogOpen(doc: Document = document): boolean {
  return doc.querySelector('[aria-modal="true"]') !== null;
}

/** Ctrl/Cmd/Alt chords belong to the browser and OS; Shift alone is needed for `?`. */
export function hasCommandModifier(e: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}

export function navShortcutFor(key: string): NavShortcut | undefined {
  const k = key.toLowerCase();
  return NAV_SHORTCUTS.find(s => s.key === k);
}

export const SHORTCUT_HELP_EVENT = 'fc:shortcut-help';

/** Opens the `?` overlay from a button (the rail), without importing the host. */
export function requestShortcutHelp(): void {
  window.dispatchEvent(new Event(SHORTCUT_HELP_EVENT));
}

/**
 * True between `g` and its second key. Single-letter shortcuts on a screen (Learn's
 * h/s/n) stand down then, so `g` `h` goes Home instead of also toggling a hint.
 */
let chordPending = false;
export const isChordPending = (): boolean => chordPending;
export const setChordPending = (pending: boolean): void => {
  chordPending = pending;
};

/**
 * Escape-as-back. A screen with its own sense of "back" (Learn's topic setup → the
 * topic grid) registers a handler; the newest one is asked first. Returning true
 * means "handled — or deliberately blocked", so Escape never navigates out from
 * under a screen that is mid-task. With no handler (or all returning false) the
 * global handler goes back one page.
 */
type BackHandler = () => boolean;
const backHandlers: BackHandler[] = [];

export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const i = backHandlers.lastIndexOf(handler);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}

/** Runs the registered handlers, newest first; true when one claimed the key. */
export function runBackHandlers(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i--) {
    if (backHandlers[i]()) return true;
  }
  return false;
}

/**
 * Whether a Space keydown should drive the recorder. Typing fields, open dialogs, held keys and
 * Ctrl/Cmd/Alt chords are left alone. A focused *button* is deliberately NOT a reason to stand
 * down: after the learner taps Hint, Listen or a setting the browser leaves focus on that button,
 * and Space would otherwise re-press it instead of recording ("Space does nothing"). Links,
 * <select>, <summary> and tab/menu/switch-style controls keep their own Space.
 */
const OWNS_SPACE = 'a[href],select,summary,[role="tab"],[role="menuitem"],[role="switch"],[role="checkbox"],[role="radio"],[role="link"],[role="slider"]';

export function shouldRecordOnSpace(e: KeyboardEvent): boolean {
  if (e.code !== 'Space' || e.repeat || e.defaultPrevented || hasCommandModifier(e)) return false;
  if (isTypingTarget(e.target) || isDialogOpen()) return false;
  const t = e.target;
  if (t instanceof Element && t.closest(OWNS_SPACE) !== null) return false;
  return true;
}
