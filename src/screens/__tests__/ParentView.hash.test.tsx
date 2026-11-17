// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

/**
 * Security review F13: the parent link's token is read from the hash once and
 * then removed from the address bar, so error reports, page-load traces and a
 * shared screen never carry it. The page keeps working from state.
 */
const fetchParentReport = vi.hoisted(() => vi.fn(() => new Promise(() => {})));

vi.mock('../../features/parentView/parentLinkService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/parentView/parentLinkService')>();
  return { ...actual, fetchParentReport };
});

import { ParentView } from '../ParentView';

const TOKEN = 'c'.repeat(64);
const OTHER = 'd'.repeat(64);

afterEach(() => {
  cleanup();
  fetchParentReport.mockClear();
  window.history.replaceState(null, '', '/');
});

describe('ParentView hash token', () => {
  it('removes the token from the address bar but still loads the report with it', () => {
    window.history.replaceState(null, '', `/parent?utm_source=email#${TOKEN}`);
    render(<ParentView />);
    expect(window.location.hash).toBe('');
    expect(window.location.pathname + window.location.search).toBe('/parent?utm_source=email');
    expect(fetchParentReport).toHaveBeenCalledWith(TOKEN);
  });

  it('takes a new link pasted later, and an emptied hash does not clear the token', () => {
    window.history.replaceState(null, '', `/parent#${TOKEN}`);
    render(<ParentView />);
    act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(fetchParentReport).toHaveBeenLastCalledWith(TOKEN);

    act(() => {
      window.history.replaceState(null, '', `/parent#${OTHER}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(fetchParentReport).toHaveBeenLastCalledWith(OTHER);
    expect(window.location.hash).toBe('');
  });
});
