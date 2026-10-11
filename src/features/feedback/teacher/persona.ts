/**
 * The one named teacher behind Learn's feedback (Learn feedback Batch 6b).
 * Static strings only: the persona is frontend chrome, so renaming it is a
 * one-line change here and needs no prompt or contract version bump.
 *
 * Two registers share the voice: `coach` is warm and speaks to "you";
 * `examiner` is formal. Neither ever speaks a mark, band or grade (ADR 0005).
 */

export type TeacherRegister = 'coach' | 'examiner';

/** Placeholder — the owner can rename it. */
export const TEACHER_NAME = 'Madame Laurent';

/** Two letters for the avatar chip (an initials badge, not an image). */
export function teacherInitials(name: string = TEACHER_NAME): string {
  const letters = name
    .split(/\s+/)
    .map((part) => part.replace(/^[^\p{L}]+/u, '')[0])
    .filter((c): c is string => !!c);
  return (letters.length > 1 ? letters[0] + letters[letters.length - 1] : (letters[0] ?? '')).toLocaleUpperCase('fr');
}

const MAX_NAME_LENGTH = 24;
const PLAIN_NAME = /^[\p{L}\p{N} _.'’-]+$/u;

/**
 * The learner's name as the teacher may say it, from `state.username`, or null.
 * That field is a public handle, so anything that doesn't read as a name
 * (an email, symbols, an over-long string) is left unsaid rather than echoed.
 */
export function addressName(raw: string | null | undefined): string | null {
  const name = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (name === '' || name.length > MAX_NAME_LENGTH || !PLAIN_NAME.test(name)) return null;
  return name;
}
