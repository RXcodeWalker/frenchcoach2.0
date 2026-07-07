import { describe, it, expect, vi } from 'vitest';
import { completeMinigameSession } from '../utils/completeMinigameSession';

vi.mock('../../../context/AppContext', () => ({
  dispatchAddXP: vi.fn(),
}));

import { dispatchAddXP } from '../../../context/AppContext';

describe('completeMinigameSession', () => {
  it('dispatches XP when score is positive', () => {
    const dispatch = vi.fn();
    completeMinigameSession({ dispatch, score: 50 });
    expect(dispatchAddXP).toHaveBeenCalledWith(dispatch, 50);
  });

  it('skips dispatch when score is zero', () => {
    vi.mocked(dispatchAddXP).mockClear();
    const dispatch = vi.fn();
    completeMinigameSession({ dispatch, score: 0 });
    expect(dispatchAddXP).not.toHaveBeenCalled();
  });
});
