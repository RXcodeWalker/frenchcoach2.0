import { describe, it, expect } from 'vitest';
import { FOLLOWUP_MAX_PER_SESSION } from '../followUpThresholds';

describe('FOLLOWUP_MAX_PER_SESSION', () => {
  it('caps follow-up turns at 3 per session', () => {
    expect(FOLLOWUP_MAX_PER_SESSION).toBe(3);
  });
});
