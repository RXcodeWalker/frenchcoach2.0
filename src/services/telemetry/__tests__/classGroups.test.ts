// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classGroupProperties, primaryClass, syncClassGroup, type ClassSource } from '../classGroups';
import { setAnalyticsClientForTests } from '../posthogClient';

const cls = (id: string, joinedAt: string, name = `Class ${id}`) => ({ id, name, examYear: '2027', joinedAt });
const NOW = new Date(2026, 10, 23, 9);

function fakeClient() {
  return { capture: vi.fn(), identify: vi.fn(), reset: vi.fn(), register: vi.fn(), setPersonProperties: vi.fn(), get_distinct_id: vi.fn(), group: vi.fn(), set_config: vi.fn() };
}

describe('class groups', () => {
  let client: ReturnType<typeof fakeClient>;
  beforeEach(() => {
    localStorage.clear();
    client = fakeClient();
    setAnalyticsClientForTests(client as never);
  });
  afterEach(() => setAnalyticsClientForTests(null));

  it('primaryClass is the one joined first', () => {
    expect(primaryClass([cls('b', '2026-11-05'), cls('a', '2026-10-01')])?.id).toBe('a');
    expect(primaryClass([])).toBeNull();
  });

  it('group properties are the class name (capped) and exam year — nothing else', () => {
    expect(classGroupProperties(cls('a', 'x', 'Y'.repeat(100)))).toEqual({ name: 'Y'.repeat(48), exam_year: '2027' });
  });

  it('puts a student in their class group once, and reports the facts', async () => {
    const source: ClassSource = { myClasses: vi.fn(async () => [cls('c1', '2026-10-01'), cls('c2', '2026-11-01')]), isTeacher: vi.fn(async () => false) };
    expect(await syncClassGroup('u1', source, NOW)).toEqual({ isTeacher: false, classCount: 2 });
    expect(client.group).toHaveBeenCalledTimes(1);
    expect(client.group).toHaveBeenCalledWith('class', 'c1', { name: 'Class c1', exam_year: '2027' });
    // Same day, same account: served from the cache, no second lookup, no second group event.
    await syncClassGroup('u1', source, NOW);
    expect(source.myClasses).toHaveBeenCalledTimes(1);
    expect(client.group).toHaveBeenCalledTimes(1);
  });

  it('looks up again the next day, and never groups a teacher as a student', async () => {
    const source: ClassSource = { myClasses: vi.fn(async () => [cls('c1', '2026-10-01')]), isTeacher: vi.fn(async () => true) };
    expect(await syncClassGroup('t1', source, NOW)).toEqual({ isTeacher: true, classCount: 1 });
    expect(client.group).not.toHaveBeenCalled();
    await syncClassGroup('t1', source, new Date(2026, 10, 24, 9));
    expect(source.myClasses).toHaveBeenCalledTimes(2);
  });

  it('a failed lookup is no group, not an error', async () => {
    const source: ClassSource = {
      myClasses: vi.fn(async () => {
        throw new Error('rpc failed');
      }),
      isTeacher: vi.fn(async () => {
        throw new Error('rls');
      }),
    };
    await expect(syncClassGroup('u2', source, NOW)).resolves.toEqual({ isTeacher: false, classCount: 0 });
    expect(client.group).not.toHaveBeenCalled();
  });
});
