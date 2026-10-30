// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { isHiddenPath } from '../../config/launchScope';
import {
  NAV_SHORTCUTS,
  hasCommandModifier,
  isDialogOpen,
  isInteractiveTarget,
  isTypingTarget,
  navShortcutFor,
} from '../keyboardShortcuts';

afterEach(() => {
  document.body.innerHTML = '';
});

function el(html: string): Element {
  document.body.innerHTML = html;
  return document.body.firstElementChild!;
}

describe('navigation shortcuts', () => {
  it('only point at paths visible in the launch scope', () => {
    for (const s of NAV_SHORTCUTS) expect(isHiddenPath(s.path)).toBe(false);
  });

  it('use one distinct key each', () => {
    const keys = NAV_SHORTCUTS.map(s => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolve case-insensitively and ignore unknown keys', () => {
    expect(navShortcutFor('L')?.path).toBe('/learn');
    expect(navShortcutFor('z')).toBeUndefined();
  });
});

describe('target guards', () => {
  it('treats text fields as typing, buttons and checkboxes as not', () => {
    expect(isTypingTarget(el('<textarea></textarea>'))).toBe(true);
    expect(isTypingTarget(el('<input type="text">'))).toBe(true);
    expect(isTypingTarget(el('<input>'))).toBe(true);
    expect(isTypingTarget(el('<div contenteditable="true"></div>'))).toBe(true);
    expect(isTypingTarget(el('<input type="checkbox">'))).toBe(false);
    expect(isTypingTarget(el('<button>x</button>'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it('knows which elements own Space themselves', () => {
    expect(isInteractiveTarget(el('<button><span id="i">x</span></button>').querySelector('#i'))).toBe(true);
    expect(isInteractiveTarget(el('<a href="/x">x</a>'))).toBe(true);
    expect(isInteractiveTarget(el('<div>x</div>'))).toBe(false);
  });

  it('detects an open modal dialog', () => {
    expect(isDialogOpen()).toBe(false);
    el('<div role="dialog" aria-modal="true"></div>');
    expect(isDialogOpen()).toBe(true);
  });

  it('leaves Ctrl/Cmd/Alt chords to the browser but not Shift', () => {
    expect(hasCommandModifier({ ctrlKey: true, metaKey: false, altKey: false })).toBe(true);
    expect(hasCommandModifier({ ctrlKey: false, metaKey: true, altKey: false })).toBe(true);
    expect(hasCommandModifier({ ctrlKey: false, metaKey: false, altKey: true })).toBe(true);
    expect(hasCommandModifier({ ctrlKey: false, metaKey: false, altKey: false })).toBe(false);
  });
});
