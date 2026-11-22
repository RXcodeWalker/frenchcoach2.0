/**
 * Puts a signed-in learner in a PostHog `class` group so every dashboard can be
 * broken down by class — the question a school trial exists to answer ("how is
 * 10B doing against 10C?"). Also tells analytics whether the account is a
 * teacher, so teachers browsing their dashboard never count as students.
 *
 * The lookup goes through the existing class RPCs (`my_classes`, the learner's
 * own view; `teacher_profiles`, their own row) at most once per local day per
 * account, cached in analyticsState. It never throws: a failed lookup is just
 * no group. The group key is the class id (opaque); its `name` is what the
 * teacher typed ("Year 10 French") — class names, never student names, join
 * codes or teacher names.
 */
import { claimGroupChange, getClassCache, setClassCache, type ClassCache, type ClassInfo } from './analyticsState';
import { setAnalyticsGroup } from './posthogClient';

export interface ClassSource {
  myClasses(): Promise<ClassInfo[]>;
  isTeacher(userId: string): Promise<boolean>;
}

/** The real lookups, imported on demand so the class API stays out of the startup bundle. */
export const supabaseClassSource: ClassSource = {
  async myClasses() {
    const { getMyClasses } = await import('../teacher/teacherApi');
    const rows = await getMyClasses();
    return rows.map((c) => ({ id: c.classId, name: c.className, examYear: c.examYear, joinedAt: c.joinedAt }));
  },
  async isTeacher(userId) {
    const { getMyTeacherProfile } = await import('../teacher/teacherApi');
    return (await getMyTeacherProfile(userId)) !== null;
  },
};

/** The class a learner is grouped under: the one they joined first (a student may be in up to five). */
export function primaryClass(classes: readonly ClassInfo[]): ClassInfo | null {
  if (classes.length === 0) return null;
  return [...classes].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))[0];
}

export function classGroupProperties(c: ClassInfo): Record<string, string> {
  return { name: c.name.slice(0, 48), ...(c.examYear ? { exam_year: c.examYear.slice(0, 16) } : {}) };
}

export async function loadClassCache(userId: string, source: ClassSource, now: Date = new Date()): Promise<ClassCache | null> {
  const cached = getClassCache(userId, now);
  if (cached) return cached;
  try {
    const [classes, isTeacher] = await Promise.all([source.myClasses().catch(() => []), source.isTeacher(userId).catch(() => false)]);
    const cache: ClassCache = { userId, day: localDayOf(now), classes, isTeacher };
    setClassCache(cache);
    return cache;
  } catch {
    return null;
  }
}

function localDayOf(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export interface ClassFacts {
  isTeacher: boolean;
  classCount: number;
}

/**
 * Looks the account up, puts a student in their class group, and returns the
 * facts the caller adds to the person properties (kept out of here so the
 * person is updated once, only when something changed).
 */
export async function syncClassGroup(userId: string, source: ClassSource = supabaseClassSource, now: Date = new Date()): Promise<ClassFacts | null> {
  const cache = await loadClassCache(userId, source, now);
  if (!cache) return null;
  const primary = cache.isTeacher ? null : primaryClass(cache.classes);
  if (primary && claimGroupChange(`${userId}|${primary.id}|${primary.name}`)) {
    setAnalyticsGroup('class', primary.id, classGroupProperties(primary));
  }
  return { isTeacher: cache.isTeacher, classCount: cache.classes.length };
}
