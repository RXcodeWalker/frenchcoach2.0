import { describe, expect, it } from 'vitest';
import { parseTeacherMarkSet, TeacherMarkValidationError } from '../teacherMark';

describe('parseTeacherMarkSet', () => {
  it('parses a valid TeacherMarkSet', () => {
    const raw = {
      sessionId: 's1',
      markedBy: 'teacher-a',
      markedAt: '2026-07-10T00:00:00.000Z',
      marks: [
        { criterion: 'rolePlayTask', taskId: 't1', mark: 2 },
        { criterion: 'communication', mark: 10, comment: 'good' },
        { criterion: 'qualityOfLanguage', mark: 8 },
      ],
      pronunciationMovedQol: { moved: true, note: 'clear accent shifted band' },
    };

    const parsed = parseTeacherMarkSet(raw);
    expect(parsed.marks).toHaveLength(3);
    expect(parsed.pronunciationMovedQol?.moved).toBe(true);
  });

  it('throws TeacherMarkValidationError on malformed input', () => {
    expect(() => parseTeacherMarkSet({ sessionId: 's1' })).toThrow(TeacherMarkValidationError);
  });

  it('throws on an unknown criterion', () => {
    const raw = {
      sessionId: 's1',
      markedBy: 'teacher-a',
      markedAt: '2026-07-10T00:00:00.000Z',
      marks: [{ criterion: 'pronunciation', mark: 5 }],
    };
    expect(() => parseTeacherMarkSet(raw)).toThrow(TeacherMarkValidationError);
  });
});
