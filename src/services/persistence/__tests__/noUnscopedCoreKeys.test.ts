// @vitest-environment jsdom
// ── Phase 1.4 regression guard ──────────────────────────────────────────────
// The identity-scoping bug was: storage.ts implements per-identity key
// namespacing (base::identity), but the highest-value stores (analytics,
// progression, roadmap, diagnostic, topic mastery, the needs-sync flag) called
// raw localStorage with the BARE key, so two accounts on one browser shared
// XP / gems / streak / transcripts. This test exercises each store's write
// path under a set scope and asserts that NO bare core key is ever written —
// only the ::scope variant. It is the check that would have caught the
// original defect.

import { describe, it, expect, beforeEach } from 'vitest';
import { STORAGE_KEYS, setStorageScope } from '../storage';
import { recordSession, updateTopicMastery } from '../../analytics/analyticsService';
import { markNeedsSync } from '../../progression/progressionService';
import { updateRoadmapPronunciation } from '../../progression/roadmapService';
import { writeSkillProfile } from '../../coaching/diagnosticEngine';
import type { Session, TopicMasteryEntry, SkillProfile } from '../../../types';

const CORE_KEYS: readonly string[] = [
  STORAGE_KEYS.analytics,
  STORAGE_KEYS.progression,
  STORAGE_KEYS.roadmap,
  STORAGE_KEYS.diagnosticSDE,
  STORAGE_KEYS.topicMastery,
  STORAGE_KEYS.needsSync,
];

const SCOPE = 'accountUnderTest';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `sess-${Math.random().toString(36).slice(2)}`,
    mode: 'practice',
    topicKey: 'school',
    wordCount: 40,
    score: 6,
    xpEarned: 20,
    durationSec: 30,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTopicMastery(): TopicMasteryEntry {
  return {
    topicKey: 'school',
    sessionsCompleted: 1,
    uniqueQuestionsAnswered: ['q1'],
    averageScore: 6,
    lastSessionAt: new Date().toISOString(),
    mastered: false,
  };
}

function makeSkillProfile(): SkillProfile {
  return {
    elision: { score: 0.7, feedbackCount: 3, lastSeen: Date.now(), recentScores: [0.7] },
  } as unknown as SkillProfile;
}

function bareCoreKeysPresent(): string[] {
  return CORE_KEYS.filter((k) => localStorage.getItem(k) !== null);
}

describe('core stores never write a bare (unscoped) key once a scope is set', () => {
  beforeEach(() => {
    localStorage.clear();
    setStorageScope(SCOPE);
  });

  it('analyticsService.recordSession writes only analytics::scope', () => {
    recordSession(makeSession());
    expect(bareCoreKeysPresent()).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEYS.analytics}::${SCOPE}`)).not.toBeNull();
  });

  it('analyticsService.updateTopicMastery writes only topicMastery::scope', () => {
    updateTopicMastery(makeTopicMastery());
    expect(bareCoreKeysPresent()).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEYS.topicMastery}::${SCOPE}`)).not.toBeNull();
  });

  it('progressionService.markNeedsSync writes only needsSync::scope', () => {
    markNeedsSync();
    expect(bareCoreKeysPresent()).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEYS.needsSync}::${SCOPE}`)).toBe('1');
  });

  it('roadmapService.updateRoadmapPronunciation writes only roadmap::scope', () => {
    updateRoadmapPronunciation([{ probability: 0.9 }, { probability: 0.8 }]);
    expect(bareCoreKeysPresent()).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEYS.roadmap}::${SCOPE}`)).not.toBeNull();
  });

  it('diagnosticEngine.writeSkillProfile writes only diagnosticSDE::scope', () => {
    writeSkillProfile(makeSkillProfile());
    expect(bareCoreKeysPresent()).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEYS.diagnosticSDE}::${SCOPE}`)).not.toBeNull();
  });

  it('after exercising every core write path, not one bare core key exists', () => {
    recordSession(makeSession());
    updateTopicMastery(makeTopicMastery());
    markNeedsSync();
    updateRoadmapPronunciation([{ probability: 0.6 }]);
    writeSkillProfile(makeSkillProfile());

    expect(bareCoreKeysPresent()).toEqual([]);
  });
});
