import { describe, expect, it } from 'vitest';
import { notificationOpenFromSearch } from '../notificationOpen';

describe('notificationOpenFromSearch', () => {
  it('reads a nudge link', () => {
    expect(notificationOpenFromSearch('?utm_source=nudge&utm_medium=push&utm_campaign=mistake_comeback'))
      .toEqual({ campaign: 'mistake_comeback', channel: 'push' });
    expect(notificationOpenFromSearch('?utm_source=nudge&utm_medium=email&utm_campaign=weekly_fix'))
      .toEqual({ campaign: 'weekly_fix', channel: 'email' });
  });

  it('ignores anything else', () => {
    expect(notificationOpenFromSearch('')).toBeNull();
    expect(notificationOpenFromSearch('?utm_source=google&utm_medium=push&utm_campaign=x')).toBeNull();
    expect(notificationOpenFromSearch('?utm_source=nudge&utm_medium=sms&utm_campaign=x')).toBeNull();
    expect(notificationOpenFromSearch('?utm_source=nudge&utm_medium=push&utm_campaign=Robert%27);DROP')).toBeNull();
  });
});
