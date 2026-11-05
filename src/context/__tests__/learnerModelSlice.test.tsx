// @vitest-environment jsdom
//
// learner-model §4.2 — the AppState slice: RECORD_SKILL_OBSERVATIONS,
// ADD_SESSION's counted-exam derivation, HYDRATE_LEARNER_MODEL, and the
// appendEvidenceEvents listener AppProvider subscribes (mounted for real).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

vi.mock('../AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() }, from: vi.fn(), rpc: vi.fn() }, supabaseConfigured: false }));

import { AppProvider, reducer, useApp } from '../AppContext';
import { appendEvidenceEvents } from '../../services/coach/coachStorage';
import { STORAGE_KEYS, setStorageScope, storageGet } from '../../services/persistence/storage';
import { emptyModel } from '../../domain/learnerModel/update';
import { readSkill } from '../../domain/learnerModel/read';
import type { EvidenceEvent } from '../../types/evidence';
import type { Session } from '../../types';

const NOW = Date.UTC(2026, 10, 2, 10);

function state() {
  return { learnerModel: emptyModel('dev-1'), recentSessions: [], profile: { sessions_count: 0, total_words_spoken: 0, current_level: 'Beginner' }, achievements: [], xpAnimations: [], gemAnimations: [] } as unknown as Parameters<typeof reducer>[0];
}

function examSession(over: Partial<Session> = {}): Session {
  return {
    id: 'exam-1', mode: 'exam', questionText: '', transcript: '', wordCount: 0, score: 7, xpEarned: 10, durationSec: 600,
    createdAt: new Date(NOW).toISOString(), practiceOnly: false,
    examMarks: { rolePlay: 6, rolePlayMax: 15, communication: 9, qualityOfLanguage: 12, total: 27 },
    ...over,
  };
}

function addSession(s: Parameters<typeof reducer>[0], session: Session) {
  return reducer(s, {
    type: 'ADD_SESSION', session, newUnlockedAchievementIds: [], newLevelName: 'Beginner',
    xpResult: { gain: 10, totalXP: 10, gemsGain: 0, totalGems: 0, activeBoosters: [] },
  });
}

function event(id: string, nodes: string[], success: boolean): EvidenceEvent {
  return {
    id, learnerId: 'local-user', occurredAt: new Date(NOW).toISOString(), sourceSessionId: id, evidenceType: 'language',
    targetNodeIds: nodes, observation: {}, result: { success },
    reliability: { assessmentConfidence: 0.8, taskValidity: 0.9, signalQuality: 0.9, evaluator: 'llm', rubricVersion: 'x' },
    context: { mode: 'practice', timed: false },
  };
}

describe('learner-model §4.2 — reducer', () => {
  beforeEach(() => {
    localStorage.clear();
    setStorageScope('user-1');
  });

  it('a counted Exam Sim records the three areas once; persisted', () => {
    const s1 = addSession(state(), examSession());
    expect(Object.keys(s1.learnerModel.devices['dev-1'].skills).sort()).toEqual(['exam:communication', 'exam:qualityOfLanguage', 'exam:rolePlay']);
    expect(storageGet<{ devices: object }>(STORAGE_KEYS.learnerModel, { devices: {} }).devices).toHaveProperty('dev-1');
    const s2 = addSession(s1, examSession());
    expect(s2.learnerModel).toBe(s1.learnerModel);
  });

  it('a practice-only exam, a Learn answer and an exam without marks change nothing', () => {
    const base = state();
    expect(addSession(base, examSession({ practiceOnly: true })).learnerModel).toBe(base.learnerModel);
    expect(addSession(base, examSession({ mode: 'practice' })).learnerModel).toBe(base.learnerModel);
    expect(addSession(base, examSession({ examMarks: undefined })).learnerModel).toBe(base.learnerModel);
    expect(localStorage.getItem(`${STORAGE_KEYS.learnerModel}::user-1`)).toBeNull();
  });

  it('RECORD_SKILL_OBSERVATIONS is idempotent; HYDRATE_LEARNER_MODEL replaces the slice', () => {
    const obs = [{ id: 'o1', skillIds: ['gender'], at: NOW, kind: 'outcome' as const, success: 0, weight: 0.5 }];
    const s1 = reducer(state(), { type: 'RECORD_SKILL_OBSERVATIONS', observations: obs, now: NOW });
    expect(readSkill(s1.learnerModel, 'gender', NOW)?.evidenceCount).toBe(1);
    expect(reducer(s1, { type: 'RECORD_SKILL_OBSERVATIONS', observations: obs, now: NOW })).toBe(s1);
    const other = emptyModel('dev-1');
    expect(reducer(s1, { type: 'HYDRATE_LEARNER_MODEL', model: other }).learnerModel).toBe(other);
  });
});

function Probe({ onState }: { onState: (m: ReturnType<typeof useApp>['state']['learnerModel']) => void }) {
  const { state: s } = useApp();
  onState(s.learnerModel);
  return null;
}

describe('learner-model §4.2 — AppProvider feeds every appended evidence batch into the model', () => {
  beforeEach(() => {
    localStorage.clear();
    setStorageScope('guest');
  });
  afterEach(() => cleanup());

  it('bootstraps, persists, then records new evidence once through the listener', () => {
    let latest: ReturnType<typeof useApp>['state']['learnerModel'] | null = null;
    render(<AppProvider identity="guest"><Probe onState={(m) => { latest = m; }} /></AppProvider>);
    expect(latest).not.toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEYS.learnerModel}::guest`)).not.toBeNull();

    act(() => { appendEvidenceEvents([event('e1', ['tense_past'], false)]); });
    const deviceId = latest!.deviceId;
    expect(readSkill(latest!, 'tense_past', NOW)?.evidenceCount).toBe(1);
    expect(latest!.devices[deviceId]).toBeDefined();

    // The same event appended again (e.g. a retry) is not counted twice.
    act(() => { appendEvidenceEvents([event('e1', ['tense_past'], false)]); });
    expect(readSkill(latest!, 'tense_past', NOW)?.evidenceCount).toBe(1);
  });

  it('after unmount the listener is gone (no dispatch into a dead provider)', () => {
    const { unmount } = render(<AppProvider identity="guest"><Probe onState={() => {}} /></AppProvider>);
    unmount();
    expect(() => appendEvidenceEvents([event('e2', ['gender'], true)])).not.toThrow();
  });
});
