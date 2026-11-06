import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, RefreshCw, UserMinus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { InlineAlert } from '../../components/auth/InlineAlert';
import { useAuth } from '../../context/AuthContext';
import {
  clearCoTeacherCode,
  getClassTeachers,
  removeClassTeacher,
  rotateCoTeacherCode,
  teacherErrorMessage,
  type ClassTeacher,
  type ClassTeachers,
} from '../../services/teacher/teacherApi';
import { EYEBROW } from './teachUtils';

/** Most teachers a class can have (the owner + 4), the server's join_class_as_teacher cap. */
const MAX_TEACHERS = 5;

/**
 * The class's teachers (teacher-dashboard.md §2). The owner shares a co-teacher code
 * ("T-" + 6 characters — never the students' code) and can remove co-teachers; a
 * co-teacher can leave. Every teacher sees and does what the owner does except archiving
 * the class and managing teachers. Each teacher's marks stay their own.
 */
export function ClassTeachersSection({ classId, className }: { classId: string; className: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState<ClassTeachers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<ClassTeacher | null>(null);

  const load = useCallback(async () => {
    try {
      setInfo(await getClassTeachers(classId));
    } catch (err) {
      setError(teacherErrorMessage(err));
    }
  }, [classId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(teacherErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (!info) return error ? <InlineAlert>{error}</InlineAlert> : null;
  const isOwner = info.myRole === 'owner';
  const full = info.teachers.length >= MAX_TEACHERS;

  return (
    <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5" aria-labelledby="teachers-h" data-testid="class-teachers">
      <div>
        <p className={EYEBROW}>Teachers</p>
        <h2 id="teachers-h" className="text-section text-ink mt-1">
          {info.teachers.length === 1 ? 'Just you so far' : `${info.teachers.length} teachers`}
        </h2>
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      <div className="overflow-hidden rounded-card border border-hairline">
        {info.teachers.map((t) => (
          <div key={t.teacherId} className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2 first:border-t-0">
            <span className="text-body-s text-ink">
              {t.displayName}
              {t.teacherId === user?.id && <span className="text-ink-subtle"> (you)</span>}
              <span className="text-caption text-ink-subtle"> · {t.role === 'owner' ? 'Owner' : 'Co-teacher'}</span>
            </span>
            {isOwner && t.role === 'co_teacher' && (
              <Button variant="quiet" size="sm" onClick={() => setRemoving(t)}>
                <UserMinus size={14} aria-hidden="true" /> Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      {isOwner ? (
        <div className="flex flex-col gap-2">
          {info.coTeacherCode ? (
            <>
              <p className="text-body-s text-ink-muted">
                Co-teacher code: <span className="font-numeral tracking-[0.12em] text-ink" data-testid="co-teacher-code">{info.coTeacherCode}</span>
              </p>
              <p className="text-caption text-ink-subtle">
                Give it only to a colleague who already has a teacher account. They enter it at Teacher → "Join a colleague's
                class". It is not the students' code.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(info.coTeacherCode ?? '');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* the code is on screen */
                    }
                  }}
                >
                  <Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy code'}
                </Button>
                <Button variant="quiet" size="sm" loading={busy === 'rotate'} onClick={() => void run('rotate', () => rotateCoTeacherCode(classId))}>
                  <RefreshCw size={14} aria-hidden="true" /> New code
                </Button>
                <Button variant="quiet" size="sm" loading={busy === 'clear'} onClick={() => void run('clear', () => clearCoTeacherCode(classId))}>
                  Turn off
                </Button>
              </div>
            </>
          ) : (
            <div>
              <Button variant="secondary" size="sm" disabled={full} loading={busy === 'rotate'} onClick={() => void run('rotate', () => rotateCoTeacherCode(classId))}>
                Invite a co-teacher
              </Button>
              <p className="text-caption text-ink-subtle mt-2">
                {full
                  ? `A class can have up to ${MAX_TEACHERS} teachers.`
                  : 'Co-teachers see the same students and practice, set homework and mark attempts. Only you can archive the class or change its teachers.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <Button variant="destructive" size="sm" loading={busy === 'leave'} onClick={() => void run('leave', async () => {
            if (!user) return;
            await removeClassTeacher(classId, user.id);
            navigate('/teach');
          })}>
            Stop co-teaching {className}
          </Button>
          <p className="text-caption text-ink-subtle mt-2">You'll stop seeing this class. Your marks stay saved; the owner can invite you back.</p>
        </div>
      )}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this co-teacher?"
        footer={
          <>
            <Button variant="quiet" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy === 'remove'}
              onClick={() => {
                const t = removing;
                setRemoving(null);
                if (t) void run('remove', () => removeClassTeacher(classId, t.teacherId));
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-s text-ink-muted">{removing?.displayName} will stop seeing this class straight away.</p>
      </Modal>
    </section>
  );
}
