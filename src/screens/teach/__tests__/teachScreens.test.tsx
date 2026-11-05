// @vitest-environment jsdom
// Teacher dashboard screens render from the class-scoped API rows, show the least
// active student first, keep practice exams out of mark summaries, and save a teacher
// mark as a TeacherMarkSet beside (never over) the AI's.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const auth = vi.hoisted(() => ({ user: { id: 'teacher-1' } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../../services/telemetry/telemetryService', () => ({ track: vi.fn(), captureError: vi.fn() }));
// The fixture envelope below is a minimal subset; the real schema is covered by its own tests.
vi.mock('../../../domain/igcse/envelope/schema', () => ({ parseScoringEnvelope: (e: unknown) => e }));

const api = vi.hoisted(() => ({
  getClass: vi.fn(),
  getRoster: vi.fn(),
  getClassActivity: vi.fn(),
  getClassExams: vi.fn(),
  listAssignments: vi.fn(),
  getAssignmentProgress: vi.fn(),
  getExamAttempt: vi.fn(),
  saveTeacherMark: vi.fn(),
  getStudentSessions: vi.fn(),
  getClassTeachers: vi.fn(),
}));
vi.mock('../../../services/teacher/teacherApi', async (orig) => ({ ...(await orig<object>()), ...api }));

import { TeachClass } from '../TeachClass';
import { TeachAttempt } from '../TeachAttempt';

afterEach(() => {
  cleanup();
  Object.values(api).forEach((f) => f.mockReset());
});

const now = new Date().toISOString();
const klass = { id: 'k1', name: 'Year 11 French', examYear: 'June 2027', joinCode: 'ABC234', codeActive: true, timezone: 'Europe/London', digestEnabled: true, createdAt: now, myRole: 'owner' as const, ownerName: 'Ms D' };
const roster = [
  { studentId: 'a', displayName: 'Aisha', status: 'active', joinedAt: '2026-01-01T00:00:00Z', endedAt: null },
  { studentId: 'b', displayName: 'Ben', status: 'active', joinedAt: '2026-01-01T00:00:00Z', endedAt: null },
];

function loadClass() {
  api.getClass.mockResolvedValue(klass);
  api.getRoster.mockResolvedValue(roster);
  api.getClassActivity.mockResolvedValue([
    { studentId: 'a', id: 's1', mode: 'practice', topicKey: 'school', score: 7, wordCount: 20, durationSec: 120, createdAt: now, practiceOnly: null, examMarks: null, scoringSessionId: null, assignmentId: null, cefrLevel: 'A2', criticalCount: 0 },
  ]);
  api.getClassExams.mockResolvedValue([
    { studentId: 'a', attemptId: 'att-1', sessionId: 'e1', createdAt: now, total: 26, rolePlay: 8, rolePlayMax: 10, communication: 10, qualityOfLanguage: 8, qolErrors: [], reportErrors: [{ quote: 'je mange hier', correction: "j'ai mangé", category: 'tense' }], conductMode: 'examSim', countsTowardProgress: true, assignmentId: null, teacherTotal: null, teacherShared: null },
    { studentId: 'b', attemptId: 'att-2', sessionId: 'e2', createdAt: now, total: 39, rolePlay: 10, rolePlayMax: 10, communication: 15, qualityOfLanguage: 14, qolErrors: [], reportErrors: null, conductMode: 'coached', countsTowardProgress: false, assignmentId: null, teacherTotal: null, teacherShared: null },
  ]);
  api.listAssignments.mockResolvedValue([]);
  api.getAssignmentProgress.mockResolvedValue([]);
  api.getClassTeachers.mockResolvedValue({ myRole: 'owner', coTeacherCode: null, teachers: [{ teacherId: 'teacher-1', displayName: 'Ms D', role: 'owner', addedAt: now }] });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/teach/class/:classId" element={<TeachClass />} />
        <Route path="/teach/class/:classId/attempt/:attemptId" element={<TeachAttempt />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeachClass', () => {
  it('This week lists the least active student first and never counts a Coached mark', async () => {
    loadClass();
    renderAt('/teach/class/k1?tab=week');
    await screen.findByText('Year 11 French');
    const names = screen.getAllByText(/^(Aisha|Ben)$/).map((el) => el.textContent);
    expect(names[0]).toBe('Ben'); // Ben only has a Coached exam: fewer practice answers than Aisha
    // Median of counted mocks is Aisha's 26 only — Ben's Coached 39 is practice.
    expect(screen.getAllByText('26').length).toBeGreaterThan(0);
    expect(screen.queryByText('39')).toBeNull();
  });

  it('Insights ranks slips with their evidence and coverage', async () => {
    loadClass();
    renderAt('/teach/class/k1?tab=insights');
    await screen.findByText('Common slips');
    expect(screen.getByText('1. Tense')).toBeTruthy();
    expect(screen.getByText(/From 1 of 2 marked mock exams/)).toBeTruthy();
  });

  it('Students & code shows the join code, the teachers and (for the owner) archiving', async () => {
    loadClass();
    renderAt('/teach/class/k1?tab=students');
    expect((await screen.findByTestId('class-join-code')).textContent).toBe('ABC234');
    await screen.findByText('Invite a co-teacher');
    expect(screen.getByText('Archive class')).toBeTruthy();
  });

  it('a co-teacher sees the class but cannot archive it or manage teachers', async () => {
    loadClass();
    api.getClass.mockResolvedValue({ ...klass, myRole: 'co_teacher' });
    api.getClassTeachers.mockResolvedValue({
      myRole: 'co_teacher', coTeacherCode: null,
      teachers: [
        { teacherId: 'owner-1', displayName: 'Ms D', role: 'owner', addedAt: now },
        { teacherId: 'teacher-1', displayName: 'Mr Co', role: 'co_teacher', addedAt: now },
      ],
    });
    renderAt('/teach/class/k1?tab=students');
    await screen.findByText('Stop co-teaching Year 11 French');
    expect(screen.getByText(/Co-teacher with Ms D/)).toBeTruthy();
    expect(screen.queryByText('Archive class')).toBeNull();
    expect(screen.queryByText('Invite a co-teacher')).toBeNull();
    const teachers = screen.getByTestId('class-teachers');
    expect(teachers.textContent).not.toContain('Remove');
  });

  it('a class that is not the teacher’s shows an error, not data', async () => {
    api.getClass.mockResolvedValue(null);
    renderAt('/teach/class/nope');
    await screen.findByText(/isn't one of yours/);
  });
});

describe('TeachAttempt', () => {
  const envelope = {
    attemptId: 'att-1',
    sessionId: 'e1',
    rolePlayTasks: [1, 2, 3, 4, 5].map((i) => ({ taskId: `rp${i}`, mark: 2, confidence: 'high', justification: 'Clear.', evidenceSpans: [] })),
    communication: { mark: 10, band: { min: 10, max: 12, label: 'Good' }, confidence: 'medium', justification: 'Develops answers.', evidenceSpans: [] },
    qualityOfLanguage: { mark: 8, band: { min: 7, max: 9, label: 'Satisfactory' }, confidence: 'medium', justification: 'Some errors.', evidenceSpans: [], errors: [{ source: 'topic1', turnId: 't1', quote: 'je mange hier', kind: 'grammar', correction: "j'ai mangé" }] },
    total: 28,
    transcriptSnapshot: {
      contentProvenance: 'original-practice',
      rolePlay: [1, 2, 3, 4, 5].map((i) => ({ taskId: `rp${i}`, taskPrompt: `Task ${i}`, candidateResponse: `Réponse ${i}` })),
      topicConversations: [
        { conversationId: 'topic1', turns: [{ turnId: 't1', questionPrompt: 'Tu fais quoi le weekend ?', candidateResponse: 'je mange hier au restaurant' }] },
        { conversationId: 'topic2', turns: [] },
      ],
    },
  };

  it('saves the teacher’s marks as a TeacherMarkSet with their own total', async () => {
    api.getExamAttempt.mockResolvedValue({
      studentId: 'a', studentName: 'Aisha', attemptId: 'att-1', sessionId: 'e1', createdAt: now, envelope, report: null,
      conductMode: 'examSim', countsTowardProgress: true, assignmentId: null, teacherMarkSet: null, teacherShared: false, teacherMarkedAt: null,
    });
    api.saveTeacherMark.mockResolvedValue(undefined);
    renderAt('/teach/class/k1/attempt/att-1');
    await screen.findByText(/Mock exam: AI 28\/40/);
    fireEvent.change(screen.getByLabelText('Your Communication mark'), { target: { value: '12' } });
    fireEvent.click(screen.getByText('Save my marks (30/40)'));
    await waitFor(() => expect(api.saveTeacherMark).toHaveBeenCalled());
    const [classId, attemptId, markSet, total, shared] = api.saveTeacherMark.mock.calls[0];
    expect([classId, attemptId, total, shared]).toEqual(['k1', 'att-1', 30, false]);
    expect(markSet.sessionId).toBe('e1');
    expect(markSet.marks.find((m: { criterion: string }) => m.criterion === 'communication').mark).toBe(12);
    expect(markSet.marks.filter((m: { criterion: string }) => m.criterion === 'rolePlayTask')).toHaveLength(5);
  });
});
