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
  { key: 'p', path: '/progress', label: 'Go to Progress' },
  { key: 'n', path: '/notebook', label: 'Go to Notebook' },
  { key: 'u', path: '/profile', label: 'Go to Profile' },
];

export const CHORD_PREFIX = 'g';
/** How long `g` waits for its second key. */
export const CHORD_TIMEOUT_MS = 1200;

export interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string }[];
}

/** What the `?` overlay lists. */
export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Move around',
    items: NAV_SHORTCUTS.map(s => ({ keys: [CHORD_PREFIX, s.key], label: s.label })),
  },
  {
    title: 'Speaking',
    items: [{ keys: ['Space'], label: 'Start or stop recording your answer' }],
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
