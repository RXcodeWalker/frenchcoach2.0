// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'pending' }) }));

import { useSpaceToRecord } from '../useSpaceToRecord';

function Probe({ onStart }: { onStart: () => void }) {
  useSpaceToRecord({ enabled: true, isRecording: false, onStart, onStop: () => {} });
  return null;
}

afterEach(cleanup);

describe('useSpaceToRecord consent gate', () => {
  it('never arms the mic for a pending under-13 account', () => {
    const onStart = vi.fn();
    render(<Probe onStart={onStart} />);
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(onStart).not.toHaveBeenCalled();
  });
});
