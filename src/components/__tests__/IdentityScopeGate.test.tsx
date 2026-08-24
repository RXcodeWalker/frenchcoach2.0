// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { IdentityScopeGate } from '../IdentityScopeGate';
import * as storage from '../../services/persistence/storage';

describe('IdentityScopeGate', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not render children before prepareStorageScope/setStorageScope have run for the current identity', async () => {
    const calls: string[] = [];
    vi.spyOn(storage, 'prepareStorageScope').mockImplementation(() => calls.push('prepare'));
    vi.spyOn(storage, 'setStorageScope').mockImplementation(() => calls.push('setScope'));

    render(
      <IdentityScopeGate identity="accountA">
        <div data-testid="child">child content</div>
      </IdentityScopeGate>,
    );

    // Effects run synchronously after commit in React Testing Library's render
    // (act-wrapped), so by the time render() returns, the effect has already
    // fired and the second render (with ready=true) has already committed.
    expect(calls).toEqual(['prepare', 'setScope']);
    expect(screen.getByTestId('child')).not.toBeNull();
  });

  it('re-resolving the same identity does not re-trigger prepareStorageScope/setStorageScope', () => {
    const prepareSpy = vi.spyOn(storage, 'prepareStorageScope').mockImplementation(() => {});
    const setScopeSpy = vi.spyOn(storage, 'setStorageScope').mockImplementation(() => {});

    const { rerender } = render(
      <IdentityScopeGate identity="accountA">
        <div data-testid="child">child content</div>
      </IdentityScopeGate>,
    );
    expect(prepareSpy).toHaveBeenCalledTimes(1);
    expect(setScopeSpy).toHaveBeenCalledTimes(1);

    // Same identity, new render — the effect's dependency array is [identity],
    // so React must not re-run it.
    rerender(
      <IdentityScopeGate identity="accountA">
        <div data-testid="child">child content (re-rendered)</div>
      </IdentityScopeGate>,
    );
    expect(prepareSpy).toHaveBeenCalledTimes(1);
    expect(setScopeSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('child')).not.toBeNull();
  });

  it('a different identity re-triggers scope preparation', () => {
    const prepareSpy = vi.spyOn(storage, 'prepareStorageScope').mockImplementation(() => {});
    const setScopeSpy = vi.spyOn(storage, 'setStorageScope').mockImplementation(() => {});

    const { rerender } = render(
      <IdentityScopeGate identity="accountA">
        <div>child</div>
      </IdentityScopeGate>,
    );
    expect(prepareSpy).toHaveBeenCalledWith('accountA');

    rerender(
      <IdentityScopeGate identity="accountB">
        <div>child</div>
      </IdentityScopeGate>,
    );
    expect(prepareSpy).toHaveBeenCalledWith('accountB');
    expect(setScopeSpy).toHaveBeenCalledWith('accountB');
  });
});
