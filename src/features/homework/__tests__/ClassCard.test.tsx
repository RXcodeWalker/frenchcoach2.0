// @vitest-environment jsdom
// Profile's class card lists every class a learner is in (up to five), names all of a class's
// teachers, and leaves one class at a time.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ user: { id: 'student-1' } }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../../services/telemetry/telemetryService', () => ({ track: vi.fn(), captureError: vi.fn() }));
const api = vi.hoisted(() => ({
  getMyClasses: vi.fn(),
  getMySharedTeacherMarks: vi.fn(),
  getMyTeacherProfile: vi.fn(),
  leaveClass: vi.fn(),
}));
vi.mock('../../../services/teacher/teacherApi', () => api);

import { ClassCard, MAX_CLASSES_PER_STUDENT } from '../ClassCard';

afterEach(() => {
  cleanup();
  Object.values(api).forEach((f) => f.mockReset());
});

const cls = (id: string, name: string, teacherNames: string[]) => ({
  classId: id, className: name, examYear: null, teacherName: teacherNames[0], teacherNames, joinedAt: '2026-11-01T00:00:00Z',
});

function setup(classes: ReturnType<typeof cls>[]) {
  api.getMyClasses.mockResolvedValue(classes);
  api.getMySharedTeacherMarks.mockResolvedValue([]);
  api.getMyTeacherProfile.mockResolvedValue(null);
  api.leaveClass.mockResolvedValue(undefined);
  render(<MemoryRouter><ClassCard /></MemoryRouter>);
}

describe('ClassCard', () => {
  it('lists every class with all its teachers and offers another class', async () => {
    setup([cls('a', 'French', ['Ms D', 'Mr Co']), cls('b', 'Spanish', ['Sra L'])]);
    await screen.findByText('Your classes');
    expect(screen.getByText(/Ms D and Mr Co see your practice/)).toBeTruthy();
    expect(screen.getByText(/Sra L sees your practice/)).toBeTruthy();
    expect(screen.getByText('Join another class')).toBeTruthy();
  });

  it('hides "join another" at the limit', async () => {
    setup(Array.from({ length: MAX_CLASSES_PER_STUDENT }, (_, i) => cls(`c${i}`, `Class ${i}`, ['T'])));
    await screen.findByText('Class 0');
    expect(screen.queryByText('Join another class')).toBeNull();
  });

  it('leaves only the class chosen', async () => {
    setup([cls('a', 'French', ['Ms D']), cls('b', 'Spanish', ['Sra L'])]);
    fireEvent.click(await screen.findByLabelText('Leave Spanish'));
    fireEvent.click(await screen.findByText('Leave class'));
    await waitFor(() => expect(api.leaveClass).toHaveBeenCalledWith('b'));
  });
});
