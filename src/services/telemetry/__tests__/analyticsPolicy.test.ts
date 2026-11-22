import { describe, expect, it } from 'vitest';
import {
  AUTOCAPTURE_URL_IGNORELIST,
  NO_BEHAVIOUR_PREFIXES,
  behaviourCaptureAllowed,
  captureLevelFor,
  featureOf,
  isBehaviourEvent,
  isNoBehaviourRoute,
  redactSecretPath,
} from '../analyticsPolicy';

const adult = { signedIn: true, ageBand: '13_plus' as const, consentStatus: '13_plus_not_required' as const, learnerTrack: 'exam' };

describe('captureLevelFor — who may be watched', () => {
  it('a guest and a settled 13+ account get full capture', () => {
    expect(captureLevelFor({ signedIn: false, ageBand: null, consentStatus: 'unknown', learnerTrack: 'exam' })).toBe('full');
    expect(captureLevelFor(adult)).toBe('full');
    expect(captureLevelFor({ ...adult, ageBand: '13_plus', consentStatus: 'granted' })).toBe('full');
  });

  it('under-13 accounts are never watched, consent or not', () => {
    expect(captureLevelFor({ ...adult, ageBand: 'under_13', consentStatus: 'granted' })).toBe('events_only');
    expect(captureLevelFor({ ...adult, ageBand: 'under_13', consentStatus: 'pending' })).toBe('events_only');
  });

  it('fails closed while a signed-in account\'s age or consent is still unknown', () => {
    expect(captureLevelFor({ ...adult, ageBand: null })).toBe('events_only');
    expect(captureLevelFor({ ...adult, consentStatus: 'unknown' })).toBe('events_only');
    expect(captureLevelFor({ ...adult, consentStatus: 'pending' })).toBe('events_only');
    expect(captureLevelFor({ ...adult, consentStatus: 'revoked' })).toBe('events_only');
  });

  it('the Junior track is never watched (its screens track nothing by design)', () => {
    expect(captureLevelFor({ ...adult, learnerTrack: 'junior' })).toBe('events_only');
    expect(captureLevelFor({ signedIn: false, ageBand: null, consentStatus: 'unknown', learnerTrack: 'junior' })).toBe('events_only');
  });
});

describe('screens where only the page view is captured', () => {
  it.each(['/login', '/auth/callback', '/reset-password', '/guardian-consent', '/age-band', '/parent', '/teach', '/teach/class/abc/student/def', '/admin/questions', '/junior', '/junior/animals', '/join/ABC123', '/unsubscribe'])(
    '%s is excluded',
    (path) => {
      expect(isNoBehaviourRoute(path)).toBe(true);
      expect(behaviourCaptureAllowed('full', path)).toBe(false);
    },
  );

  it.each(['/', '/learn', '/learn/sounds/check', '/exam/role-play', '/rapid-fire', '/progress', '/profile', '/igcse-french-speaking/topics/school'])(
    '%s is watched at full level',
    (path) => {
      expect(isNoBehaviourRoute(path)).toBe(false);
      expect(behaviourCaptureAllowed('full', path)).toBe(true);
    },
  );

  it('matches whole segments: /authors is not /auth, /teacher-tips is not /teach', () => {
    expect(isNoBehaviourRoute('/authors')).toBe(false);
    expect(isNoBehaviourRoute('/teacher-tips')).toBe(false);
  });

  it('events_only never allows behaviour capture anywhere', () => {
    expect(behaviourCaptureAllowed('events_only', '/learn')).toBe(false);
  });

  it('the SDK ignore-list covers the same screens as the policy, as regexes on full URLs', () => {
    expect(AUTOCAPTURE_URL_IGNORELIST).toHaveLength(NO_BEHAVIOUR_PREFIXES.length);
    const ignored = (url: string) => AUTOCAPTURE_URL_IGNORELIST.some((re) => new RegExp(re).test(url));
    expect(ignored('https://french.beyondthebasics.me/teach/class/x')).toBe(true);
    expect(ignored('https://french.beyondthebasics.me/junior')).toBe(true);
    expect(ignored('https://french.beyondthebasics.me/login?next=%2Flearn')).toBe(true);
    expect(ignored('https://french.beyondthebasics.me/learn')).toBe(false);
    expect(ignored('https://french.beyondthebasics.me/authors')).toBe(false);
  });
});

describe('behaviour events and feature names', () => {
  it('knows which events the gate drops', () => {
    for (const e of ['$autocapture', '$rageclick', '$dead_click', '$heatmap', '$$heatmap']) expect(isBehaviourEvent(e)).toBe(true);
    for (const e of ['$pageview', '$pageleave', 'answer_recorded', undefined]) expect(isBehaviourEvent(e)).toBe(false);
  });

  it('featureOf is the first path segment only', () => {
    expect(featureOf('/')).toBe('home');
    expect(featureOf('/learn')).toBe('learn');
    expect(featureOf('/learn/sounds/check')).toBe('learn');
    expect(featureOf('/rapid-fire')).toBe('rapid-fire');
    expect(featureOf('/duel/9f3c2a1b-0000-4000-8000-123456789abc')).toBe('duel');
    expect(featureOf(`/${'x'.repeat(80)}`)).toHaveLength(32);
  });

  it('redacts a class join code from the path and nothing else', () => {
    expect(redactSecretPath('/join/ABC123')).toBe('/join/:code');
    expect(redactSecretPath('/join')).toBe('/join');
    expect(redactSecretPath('/learn/join/ABC123')).toBe('/learn/join/ABC123');
  });
});
